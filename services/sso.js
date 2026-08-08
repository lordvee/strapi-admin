'use strict';

/**
 * Admin-panel SSO login.
 *
 * This intentionally never creates or modifies admin_users - it only ever
 * verifies that the caller controls an email address (via the provider's
 * own OAuth token exchange + profile/userinfo endpoint) and, if that email
 * matches an existing *active* admin, mints a normal admin session for
 * them. An email with no matching admin is rejected outright.
 *
 * Each provider needs its own OAuth app registered in that provider's
 * developer console, with the callback URL
 * "<this Strapi instance's public origin>/admin/connect/<uid>/callback"
 * registered as an allowed redirect URI. Credentials are read from env
 * vars named "<UID>_CLIENT_ID" / "<UID>_CLIENT_SECRET".
 */

const axios = require('axios');
const crypto = require('crypto');

const envVar = (uid, suffix) => process.env[`${uid.toUpperCase()}_CLIENT_${suffix}`];

const PROVIDERS = {
  google: {
    displayName: 'Google',
    icon: 'https://developers.google.com/identity/images/g-logo.png',
    scope: 'openid email',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    async getVerifiedEmail(code, redirectUri) {
      const { data: tokenData } = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: envVar('google', 'ID'),
        client_secret: envVar('google', 'SECRET'),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      if (!tokenData.access_token) return null;

      const { data: profile } = await axios.get(
        'https://openidconnect.googleapis.com/v1/userinfo',
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );

      return profile.email_verified === true ? profile.email : null;
    },
  },

  github: {
    displayName: 'GitHub',
    icon: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    scope: 'user:email',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    async getVerifiedEmail(code, redirectUri) {
      const { data: tokenData } = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          code,
          client_id: envVar('github', 'ID'),
          client_secret: envVar('github', 'SECRET'),
          redirect_uri: redirectUri,
        },
        { headers: { Accept: 'application/json' } }
      );

      if (!tokenData.access_token) return null;

      const { data: emails } = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${tokenData.access_token}`,
          'User-Agent': 'punch-in-admin-sso',
        },
      });

      const primary = Array.isArray(emails) && emails.find(e => e.primary && e.verified);
      return primary ? primary.email : null;
    },
  },

  facebook: {
    displayName: 'Facebook',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
    scope: 'email',
    authorizeUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    async getVerifiedEmail(code, redirectUri) {
      const { data: tokenData } = await axios.get(
        'https://graph.facebook.com/v18.0/oauth/access_token',
        {
          params: {
            code,
            client_id: envVar('facebook', 'ID'),
            client_secret: envVar('facebook', 'SECRET'),
            redirect_uri: redirectUri,
          },
        }
      );

      if (!tokenData.access_token) return null;

      const { data: profile } = await axios.get('https://graph.facebook.com/me', {
        params: { fields: 'id,email', access_token: tokenData.access_token },
      });

      // Facebook's platform only ever returns `email` for accounts with a
      // confirmed address, so its mere presence here is the verification.
      return profile.email || null;
    },
  },

  linkedin: {
    displayName: 'LinkedIn',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
    scope: 'openid email profile',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    async getVerifiedEmail(code, redirectUri) {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: envVar('linkedin', 'ID'),
        client_secret: envVar('linkedin', 'SECRET'),
      });

      const { data: tokenData } = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (!tokenData.access_token) return null;

      const { data: profile } = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      return profile.email_verified === true ? profile.email : null;
    },
  },
};

const isConfigured = uid => Boolean(envVar(uid, 'ID') && envVar(uid, 'SECRET'));

const getConfiguredProviders = () =>
  Object.entries(PROVIDERS)
    .filter(([uid]) => isConfigured(uid))
    .map(([uid, p]) => ({ uid, displayName: p.displayName, icon: p.icon }));

const getProvider = uid => (isConfigured(uid) ? PROVIDERS[uid] : null);

// Stateless CSRF protection for the OAuth `state` param: HMAC-signed with
// the same secret used for admin JWTs, so no server-side session/store is
// needed to verify it came from a connect() call we actually issued.
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

const signState = () => {
  const { secret } = strapi.admin.services.token.getTokenOptions();
  const timestamp = Date.now().toString();
  const hmac = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  return `${timestamp}.${hmac}`;
};

const verifyState = state => {
  if (typeof state !== 'string') return false;

  const [timestamp, hmac] = state.split('.');
  if (!timestamp || !hmac) return false;

  const age = Date.now() - Number(timestamp);
  if (!Number.isFinite(age) || age < 0 || age > STATE_MAX_AGE_MS) return false;

  const { secret } = strapi.admin.services.token.getTokenOptions();
  const expected = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');

  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = {
  getConfiguredProviders,
  getProvider,
  signState,
  verifyState,
};
