'use strict';

const passport = require('koa-passport');
const compose = require('koa-compose');

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

    strapi.admin.services.auth.forgotPassword(input);

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

  async ssoProviders(ctx) {
    ctx.body = strapi.admin.services.sso.getConfiguredProviders();
  },

  async ssoConnect(ctx) {
    const { provider: providerUid } = ctx.params;
    const provider = strapi.admin.services.sso.getProvider(providerUid);

    if (!provider) {
      return ctx.notFound('Unknown or unconfigured SSO provider');
    }

    const redirectUri = getSsoCallbackUrl(ctx, providerUid);
    const state = strapi.admin.services.sso.signState();

    const authorizeUrl = new URL(provider.authorizeUrl);
    authorizeUrl.searchParams.set('client_id', process.env[`${providerUid.toUpperCase()}_CLIENT_ID`]);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', provider.scope);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('state', state);

    ctx.redirect(authorizeUrl.toString());
  },

  async ssoCallback(ctx) {
    const { provider: providerUid } = ctx.params;
    const { code, state, error } = ctx.query;
    const adminLoginUrl = getAdminLoginUrl(ctx);
    const fail = reason => ctx.redirect(`${adminLoginUrl}?ssoError=${encodeURIComponent(reason)}`);

    if (error) return fail('access_denied');
    if (!code) return fail('missing_code');
    if (!strapi.admin.services.sso.verifyState(state)) return fail('invalid_state');

    const provider = strapi.admin.services.sso.getProvider(providerUid);
    if (!provider) return fail('unsupported_provider');

    let email;
    try {
      const redirectUri = getSsoCallbackUrl(ctx, providerUid);
      email = await provider.getVerifiedEmail(code, redirectUri);
    } catch (err) {
      strapi.log.error(`SSO callback error for ${providerUid}: ${err.message}`);
      return fail('provider_error');
    }

    if (!email) return fail('email_not_verified');

    // Read-only lookup - an unrecognized or inactive email is rejected,
    // never used to create or activate an admin account.
    const user = await strapi.admin.services.auth.findActiveAdminByVerifiedEmail(email);

    if (!user) {
      strapi.eventHub.emit('admin.auth.error', {
        error: new Error('No matching active admin account for SSO email'),
        provider: providerUid,
      });
      return fail('no_admin_account');
    }

    strapi.eventHub.emit('admin.auth.success', { user, provider: providerUid });

    const token = strapi.admin.services.token.createJwtToken(user);
    ctx.redirect(`${adminLoginUrl}?ssoToken=${encodeURIComponent(token)}`);
  },
};

// The provider must redirect back to this exact URI - derived from the
// incoming request rather than strapi.config.server.url (which isn't
// reliably populated per-tenant), so it matches whatever host the browser
// is actually talking to.
function getBackendOrigin(ctx) {
  return `${ctx.request.protocol}://${ctx.request.header.host}`;
}

function getSsoCallbackUrl(ctx, providerUid) {
  return `${getBackendOrigin(ctx)}/admin/connect/${providerUid}/callback`;
}

// The admin panel frontend is served separately from this API (see
// config/server.js's serveAdminPanel: false) - ADMIN_PANEL_URL is an
// explicit override, SUBDOMAIN is what the tenant CloudFormation stack
// already provisions (see api/provider-connections), and same-origin is
// the fallback for local/single-host setups.
function getAdminLoginUrl(ctx) {
  const base = process.env.ADMIN_PANEL_URL
    ? process.env.ADMIN_PANEL_URL.replace(/\/$/, '')
    : process.env.SUBDOMAIN
    ? `https://${process.env.SUBDOMAIN}-admin.punch-in.co.uk`
    : getBackendOrigin(ctx);

  return `${base}/auth/login`;
}
