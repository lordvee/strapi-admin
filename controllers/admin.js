'use strict';

const execa = require('execa');
const _ = require('lodash');
const { sanitizeEntity } = require('strapi-utils');

const PLUGIN_NAME_REGEX = /^[A-Za-z][A-Za-z0-9-_]+$/;

/**
 * Validates a plugin name format
 */
const isValidPluginName = plugin => {
  return _.isString(plugin) && !_.isEmpty(plugin) && PLUGIN_NAME_REGEX.test(plugin);
};

/**
 * Same payload as `GET /admin/information`.
 */
const getInformation = () => ({
  currentEnvironment: strapi.app.env,
  autoReload: strapi.config.get('autoReload', false),
  strapiVersion: strapi.config.get('info.strapi', null),
  nodeVersion: process.version,
  maxUsers: strapi.config.get('info.maxUsers', 100),
  communityEdition: !strapi.EE,
});

/**
 * Returns the same payload as `GET /i18n/locales`, or null when the i18n plugin
 * is not loaded or the query fails (`/init` must keep working in that case; the
 * admin then fetches `/i18n/locales` itself).
 */
const getI18nLocales = async () => {
  try {
    const localesService = _.get(strapi, 'plugins.i18n.services.locales');
    if (!localesService) return null;

    const locales = await localesService.find();
    const model = strapi.getModel('locale', 'i18n');

    return await localesService.setIsDefault(sanitizeEntity(locales, { model }));
  } catch (err) {
    strapi.log.warn(`Could not load i18n locales for /admin/init: ${err.message}`);
    return null;
  }
};

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {
  /**
   * Public: used by the login / register pages, so it must work without a token.
   * When the request carries a valid admin token (`ctx.state.isAuthenticatedAdmin`
   * is set by the admin auth middleware; an invalid or expired token is simply
   * ignored there, never a 401) the response is enriched with the data the admin
   * would otherwise fetch right after mount (`/admin/information`, `/i18n/locales`).
   * Each extra section is independent: if one fails it is omitted and the admin
   * falls back to fetching it itself.
   */
  async init(ctx) {
    const uuid = strapi.config.get('uuid', false);
    const hasAdmin = await strapi.admin.services.user.exists();
    const data = { uuid, hasAdmin };

    if (ctx && ctx.state && ctx.state.isAuthenticatedAdmin) {
      try {
        data.information = getInformation();
      } catch (err) {
        strapi.log.warn(`Could not build information for /admin/init: ${err.message}`);
      }

      const locales = await getI18nLocales();
      if (locales) data.locales = locales;
    }

    return { data };
  },

  async information() {
    return { data: getInformation() };
  },

  async installPlugin(ctx) {
    try {
      const { plugin } = ctx.request.body;

      if (!isValidPluginName(plugin)) {
        return ctx.badRequest('Invalid plugin name');
      }

      strapi.reload.isWatching = false;

      strapi.log.info(`Installing ${plugin}...`);
      await execa('npm', ['run', 'strapi', '--', 'install', plugin]);

      ctx.send({ ok: true });

      strapi.reload();
    } catch (err) {
      strapi.log.error(err);
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  async plugins(ctx) {
    try {
      const plugins = Object.keys(strapi.plugins).reduce((acc, key) => {
        acc[key] = _.get(strapi.plugins, [key, 'package', 'strapi'], {
          name: key,
        });

        return acc;
      }, {});

      ctx.send({ plugins });
    } catch (err) {
      strapi.log.error(err);
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  async uninstallPlugin(ctx) {
    try {
      const { plugin } = ctx.params;

      if (!isValidPluginName(plugin)) {
        return ctx.badRequest('Invalid plugin name');
      }

      strapi.reload.isWatching = false;

      strapi.log.info(`Uninstalling ${plugin}...`);
      await execa('npm', ['run', 'strapi', '--', 'uninstall', plugin, '-d']);

      ctx.send({ ok: true });

      strapi.reload();
    } catch (err) {
      strapi.log.error(err);
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },
};
