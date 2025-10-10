'use strict';

const routes = require('./routes');

module.exports = strapi => ({
  beforeInitialize() {
    strapi.config.middleware.load.before.unshift('features-routes');
  },

  initialize() {
    loadFeaturesRoutes();
  },
});

const loadFeaturesRoutes = () => {
  for (const [feature, getFeatureRoutes] of Object.entries(routes)) {
    // In non-EE version, we load all routes without feature checks
    strapi.admin.config.routes.push(...getFeatureRoutes);
  }
};










