'use strict';

// Upstream Strapi CE quirk (see ./index.js): in a non-EE build this
// middleware pushes every entry here onto strapi.admin.config.routes
// UNCONDITIONALLY, with no license/feature check at all - "sso" is really
// an Enterprise-only feature bundle, and its handlers (authentication.
// getProviders/providerLogin/getProviderLoginOptions/updateProviderLogin
// Options) only exist in ee/controllers/authentication.js, which never
// loads without a valid license. Registering these against the CE
// controller throws "handler not found" and crashes the whole app at
// boot - it happened to go unnoticed here only because the old (now
// removed) mock scaffold coincidentally had a same-named getProviders.
//
// Real admin SSO now lives in config/routes.json (authentication.
// ssoProviders/ssoConnect/ssoVerify) instead - this file is deliberately
// left empty so nothing conflicts with or shadows those.
module.exports = {};











