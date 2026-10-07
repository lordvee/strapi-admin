'use strict';

const bcrypt = require('bcryptjs');
const _ = require('lodash');
const { getAbsoluteAdminUrl } = require('strapi-utils');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// SDK v3 client-lambda is preinstalled by the Node.js 18+ Lambda managed
// runtime, so it does not need to be bundled in the strapi-lambda layer.
// See controllers/authentication.js for the same pattern (SSO providers).
const lambdaClient = new LambdaClient({});

/**
 * hashes a password
 * @param {string} password - password to hash
 * @returns {string} hashed password
 */
const hashPassword = password => bcrypt.hash(password, 10);

/**
 * Validate a password
 * @param {string} password
 * @param {string} hash
 * @returns {boolean} is the password valid
 */
const validatePassword = (password, hash) => bcrypt.compare(password, hash);

/**
 * Check login credentials
 * @param {Object} options
 * @param {string} options.email
 * @param {string} options.password
 */
const checkCredentials = async ({ email, password }) => {
  const user = await strapi.query('user', 'admin').findOne({ email });

  if (!user || !user.password) {
    return [null, false, { message: 'Invalid credentials' }];
  }

  const isValid = await validatePassword(password, user.password);

  if (!isValid) {
    return [null, false, { message: 'Invalid credentials' }];
  }

  if (!(user.isActive === true)) {
    return [null, false, { message: 'User not active' }];
  }

  return [null, user];
};

/**
 * Look up an existing, active admin by a *verified* email address for SSO
 * login. Deliberately read-only - unlike checkCredentials, this must never
 * create, activate, or otherwise modify an admin_users row. An email with
 * no matching account, or matching an inactive one, yields no session.
 * @param {string} email - email already verified by the SSO provider
 */
const findActiveAdminByVerifiedEmail = async email => {
  if (!email) return null;

  const user = await strapi.query('user', 'admin').findOne({ email });
  if (!user) return null;
  if (!(user.isActive === true)) return null;

  return user;
};

/**
 * Send an email to the user if it exists or do nothing
 * @param {Object} param params
 * @param {string} param.email user email for which to reset the password
 */
const forgotPassword = async ({ email } = {}) => {
  const user = await strapi.query('user', 'admin').findOne({ email, isActive: true });

  if (!user) {
    return;
  }

  const resetPasswordToken = strapi.admin.services.token.createToken();
  await strapi.admin.services.user.updateById(user.id, { resetPasswordToken });

  // getAbsoluteAdminUrl now resolves to the tenant's real admin SPA origin
  // (ADMIN_URL in prod-stack-*.yaml), not localhost.
  const url = `${_.trimEnd(
    getAbsoluteAdminUrl(strapi.config),
    '/'
  )}/auth/reset-password?code=${resetPasswordToken}`;

  // ADMIN_EMAIL_MODE=invoke: this Lambda's VPC has no internet route, so the
  // email is sent by the central AdminEmailFunction, reached via a direct SDK
  // invoke (features/API-REDESIGN.md). Anything else keeps the old
  // strapi-plugin-email path for local/dev.
  if (process.env.ADMIN_EMAIL_MODE === 'invoke') {
    return sendAdminEmailViaInvoke({
      kind: 'forgot-password',
      to: user.email,
      firstname: user.firstname,
      url,
    });
  }

  return strapi.plugins.email.services.email
    .sendTemplatedEmail(
      {
        to: user.email,
        from: strapi.config.get('server.admin.forgotPassword.from'),
        replyTo: strapi.config.get('server.admin.forgotPassword.replyTo'),
      },
      strapi.config.get('server.admin.forgotPassword.emailTemplate'),
      {
        url,
        user: _.pick(user, ['email', 'firstname', 'lastname', 'username']),
      }
    )
    .catch(err => {
      // log error server side but do not disclose it to the user to avoid leaking informations
      strapi.log.error(err);
    });
};

// Invokes stripe-charge's AdminEmailFunction (see features/API-REDESIGN.md).
// Errors are logged, never surfaced to the caller - a forgot-password request
// returns 204 whether or not the email actually went out.
const sendAdminEmailViaInvoke = async payload => {
  const functionName = process.env.ADMIN_EMAIL_FUNCTION_NAME;
  if (!functionName) {
    strapi.log.error('ADMIN_EMAIL_FUNCTION_NAME is not configured');
    return;
  }

  try {
    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    if (response.FunctionError) {
      throw new Error(
        `AdminEmailFunction returned ${response.FunctionError}: ${Buffer.from(
          response.Payload
        ).toString('utf8')}`
      );
    }

    const result = JSON.parse(Buffer.from(response.Payload).toString('utf8'));
    if (!result.ok) {
      strapi.log.error(`AdminEmailFunction rejected request: ${result.error}`);
    }
  } catch (err) {
    strapi.log.error(`Failed to invoke AdminEmailFunction: ${err.message}`);
  }
};

/**
 * Reset a user password
 * @param {Object} param params
 * @param {string} param.resetPasswordToken token generated to request a password reset
 * @param {string} param.password new user password
 */
const resetPassword = async ({ resetPasswordToken, password } = {}) => {
  const matchingUser = await strapi
    .query('user', 'admin')
    .findOne({ resetPasswordToken, isActive: true });

  if (!matchingUser) {
    throw strapi.errors.badRequest();
  }

  return strapi.admin.services.user.updateById(matchingUser.id, {
    password,
    resetPasswordToken: null,
  });
};

module.exports = {
  checkCredentials,
  findActiveAdminByVerifiedEmail,
  validatePassword,
  hashPassword,
  forgotPassword,
  resetPassword,
};
