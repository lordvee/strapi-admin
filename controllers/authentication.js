'use strict';

const passport = require('koa-passport');
const compose = require('koa-compose');
const crypto = require('crypto');
const axios = require('axios');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Tenant Lambdas run inside a VPC with no internet route (required for the
// EFS mount - see CLAUDE.md). Reaching the central stripe-charge Lambda
// therefore goes through the VPC Interface Endpoint for the Lambda service
// (infra/shared-networking-stack.yaml) via a direct SDK invoke, not HTTPS.
// See features/API-REDESIGN.md Phase 1. The SDK v3 client-lambda package is
// preinstalled by the Node.js 18+ Lambda managed runtime, so it does not
// need to be bundled in strapi-lambda-layer.
const lambdaClient = new LambdaClient({});

const {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
  validateForgotPasswordInput,
  validateResetPasswordInput,
} = require('../validation/authentication');

module.exports = {
  login: compose([
    (ctx, next) => {
      return passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
          strapi.eventHub.emit('admin.auth.error', { error: err, provider: 'local' });
          return ctx.badImplementation();
        }

        if (!user) {
          strapi.eventHub.emit('admin.auth.error', {
            error: new Error(info.message),
            provider: 'local',
          });
          return ctx.badRequest(info.message);
        }

        ctx.state.user = user;

        strapi.eventHub.emit('admin.auth.success', { user, provider: 'local' });

        return next();
      })(ctx, next);
    },
    ctx => {
      const { user } = ctx.state;

      ctx.body = {
        data: {
          token: strapi.admin.services.token.createJwtToken(user),
          user: strapi.admin.services.user.sanitizeUser(ctx.state.user), // TODO: fetch more detailed info
        },
      };
    },
  ]),

  renewToken(ctx) {
    const { token } = ctx.request.body;

    if (token === undefined) {
      return ctx.badRequest('Missing token');
    }

    const { isValid, payload } = strapi.admin.services.token.decodeJwtToken(token);

    if (!isValid) {
      return ctx.badRequest('Invalid token');
    }

    ctx.body = {
      data: {
        token: strapi.admin.services.token.createJwtToken({ id: payload.id }),
      },
    };
  },

  async registrationInfo(ctx) {
    try {
      await validateRegistrationInfoQuery(ctx.request.query);
    } catch (err) {
      return ctx.badRequest('QueryError', err);
    }

    const { registrationToken } = ctx.request.query;

    const registrationInfo = await strapi.admin.services.user.findRegistrationInfo(
      registrationToken
    );

    if (!registrationInfo) {
      return ctx.badRequest('Invalid registrationToken');
    }

    ctx.body = { data: registrationInfo };
  },

  async register(ctx) {
    const input = ctx.request.body;

    try {
      await validateRegistrationInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const user = await strapi.admin.services.user.register(input);

    ctx.body = {
      data: {
        token: strapi.admin.services.token.createJwtToken(user),
        user: strapi.admin.services.user.sanitizeUser(user),
      },
    };
  },

  async registerAdmin(ctx) {
    const input = ctx.request.body;

    try {
      await validateAdminRegistrationInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const hasAdmin = await strapi.admin.services.user.exists();

    if (hasAdmin) {
      return ctx.badRequest('You cannot register a new super admin');
    }

    const superAdminRole = await strapi.admin.services.role.getSuperAdmin();

    if (!superAdminRole) {
      throw new Error(
        "Cannot register the first admin because the super admin role doesn't exist."
      );
    }

    const user = await strapi.admin.services.user.create({
      ...input,
      registrationToken: null,
      isActive: true,
      roles: superAdminRole ? [superAdminRole.id] : [],
    });

    await strapi.telemetry.send('didCreateFirstAdmin');

    ctx.body = {
      data: {
        token: strapi.admin.services.token.createJwtToken(user),
        user: strapi.admin.services.user.sanitizeUser(user),
      },
    };
  },

  async forgotPassword(ctx) {
    const input = ctx.request.body;

    try {
      await validateForgotPasswordInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    // Awaited: in Lambda, un-awaited async work is frozen once the response
    // returns, so the email send (SES invoke) would often never run. Still
    // 204 whether or not the address matched an account - no existence leak.
    await strapi.admin.services.auth.forgotPassword(input);

    ctx.status = 204;
  },

  async resetPassword(ctx) {
    const input = ctx.request.body;

    try {
      await validateResetPasswordInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const user = await strapi.admin.services.auth.resetPassword(input);

    ctx.body = {
      data: {
        token: strapi.admin.services.token.createJwtToken(user),
        user: strapi.admin.services.user.sanitizeUser(user),
      },
    };
  },

  // Admin SSO now goes through the central Lambda (api.punch-in.co.uk),
  // registered once per provider instead of once per tenant - see
  // stripe-charge/strapi-charge/{sso.js,controllers/ssoController.js}.
  // This instance's only remaining jobs are: (1) tell the login page which
  // provider buttons to show, (2) hand the browser off with its own
  // subdomain attached, (3) later, verify a provider-confirmed email
  // against *this* tenant's admin_users - never creating one.

  async ssoProviders(ctx) {
    // SSO_PROVIDERS_MODE=invoke is the new path (see features/API-REDESIGN.md
    // Phase 1); anything else keeps the old HTTPS call so this can be rolled
    // back per-tenant without a redeploy while the invoke path is verified.
    if (process.env.SSO_PROVIDERS_MODE === 'invoke') {
      ctx.body = await fetchSsoProvidersViaInvoke();
      return;
    }

    try {
      const { data } = await axios.get(`${getCentralApiBase()}/sso/auth/providers`, {
        timeout: 5000,
      });
      ctx.body = data;
    } catch (err) {
      strapi.log.error(`Failed to fetch SSO providers: ${err.message}`);
      ctx.body = [];
    }
  },

  async ssoConnect(ctx) {
    const { provider: providerUid } = ctx.params;
    const subdomain = process.env.SUBDOMAIN;

    if (!subdomain) {
      return ctx.badRequest('SUBDOMAIN is not configured on this Strapi instance');
    }

    const url = new URL(`${getCentralApiBase()}/sso/auth/${providerUid}`);
    url.searchParams.set('subdomain', subdomain);

    ctx.redirect(url.toString());
  },

  // POST /admin/sso/verify - called server-to-server by the central Lambda
  // once it has a provider-verified email, authenticated the same way
  // api/provider-connections' callback already is (X-Sync-Secret, constant-
  // time compare). Read-only: an unmatched or inactive email is rejected,
  // never used to create or activate an admin account.
  async ssoVerify(ctx) {
    const expected = process.env.SYNC_SECRET;
    if (!expected) {
      return ctx.internalServerError('SYNC_SECRET is not configured on this Strapi instance');
    }

    const provided = ctx.request.header['x-sync-secret'];
    if (!secretsMatch(provided, expected)) {
      return ctx.forbidden('Invalid sync secret');
    }

    const { email, provider } = ctx.request.body || {};
    const user = await strapi.admin.services.auth.findActiveAdminByVerifiedEmail(email);

    if (!user) {
      strapi.eventHub.emit('admin.auth.error', {
        error: new Error('No matching active admin account for SSO email'),
        provider: provider || 'sso',
      });
      return ctx.notFound('No matching active admin account');
    }

    strapi.eventHub.emit('admin.auth.success', { user, provider: provider || 'sso' });

    ctx.body = { token: strapi.admin.services.token.createJwtToken(user) };
  },
};

function getCentralApiBase() {
  return (process.env.PUNCHIN_INTEGRATIONS_API_BASE || 'https://api.punch-in.co.uk').replace(/\/$/, '');
}

// SsoProvidersFunction (stripe-charge/template.yaml) is also wired behind
// API Gateway via sso.js, so its handler returns an API-Gateway-proxy-shaped
// object ({ statusCode, headers, body: JSON.stringify(...) }) rather than
// the raw provider array - that shape is unchanged whether API Gateway or a
// direct InvokeCommand calls it, so it has to be unwrapped here.
async function fetchSsoProvidersViaInvoke() {
  const functionName = process.env.SSO_PROVIDERS_FUNCTION_NAME;
  if (!functionName) {
    strapi.log.error('SSO_PROVIDERS_FUNCTION_NAME is not configured');
    return [];
  }

  try {
    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
      })
    );

    if (response.FunctionError) {
      throw new Error(`SsoProvidersFunction returned ${response.FunctionError}`);
    }

    const gatewayResponse = JSON.parse(Buffer.from(response.Payload).toString('utf8'));
    return JSON.parse(gatewayResponse.body);
  } catch (err) {
    strapi.log.error(`Failed to invoke SsoProvidersFunction: ${err.message}`);
    return [];
  }
}

function secretsMatch(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
