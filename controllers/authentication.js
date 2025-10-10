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

  async getProviders(ctx) {
    try {
      // Mock providers - in a real implementation, these would come from configuration
      const providers = [
        {
          uid: 'google',
          displayName: 'Google',
          icon: 'https://developers.google.com/identity/images/g-logo.png',
        },
        {
          uid: 'github',
          displayName: 'GitHub',
          icon: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
        },
        {
          uid: 'microsoft',
          displayName: 'Microsoft',
          icon: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
        },
        {
          uid: 'facebook',
          displayName: 'Facebook',
          icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
        },
        {
          uid: 'linkedin',
          displayName: 'LinkedIn',
          icon: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
        },
      ];

      ctx.body = providers;
    } catch (err) {
      ctx.badRequest(null, 'An error occurred while retrieving providers');
    }
  },

  async providerLogin(ctx) {
    try {
      const { provider } = ctx.params;
      
      // This is where you would implement the actual OAuth flow
      // For now, we'll just redirect to the provider's OAuth URL
      const providerUrls = {
        google: `https://accounts.google.com/oauth/authorize?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&scope=openid%20email%20profile&response_type=code`,
        github: `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email`,
        microsoft: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&redirect_uri=${process.env.MICROSOFT_REDIRECT_URI}&scope=openid%20email%20profile&response_type=code`,
        facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&scope=email%20public_profile&response_type=code`,
        linkedin: `https://www.linkedin.com/oauth/v2/authorization?client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${process.env.LINKEDIN_REDIRECT_URI}&scope=r_liteprofile%20r_emailaddress&response_type=code`,
      };

      const authUrl = providerUrls[provider];
      
      if (!authUrl) {
        return ctx.badRequest(null, 'Provider not supported');
      }

      ctx.redirect(authUrl);
    } catch (err) {
      ctx.badRequest(null, 'An error occurred while connecting to provider');
    }
  },

  async getProviderLoginOptions(ctx) {
    try {
      // Mock provider login options - in a real implementation, these would come from configuration
      const options = {
        autoRegister: true,
        defaultRole: 'authenticated',
      };

      ctx.body = {
        data: options,
      };
    } catch (err) {
      ctx.badRequest(null, 'An error occurred while retrieving provider login options');
    }
  },

  async updateProviderLoginOptions(ctx) {
    try {
      const input = ctx.request.body;
      
      // In a real implementation, you would validate and save these options
      // For now, we'll just return the input as confirmation
      ctx.body = {
        data: input,
      };
    } catch (err) {
      ctx.badRequest(null, 'An error occurred while updating provider login options');
    }
  },
};
