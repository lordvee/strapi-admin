/**
 *
 * app.js
 *
 * Entry point of the application
 */

// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to a plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

/* eslint-disable */

import '@babel/polyfill';
import 'sanitize.css/sanitize.css';

// Third party css library needed
import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';
import '@fortawesome/fontawesome-free/css/all.css';
import '@fortawesome/fontawesome-free/js/all.min.js';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
// Strapi provider with the internal APIs
import { StrapiProvider } from 'strapi-helper-plugin';
import { merge } from 'lodash';
import Fonts from './components/Fonts';
import { freezeApp, pluginLoaded, unfreezeApp, updatePlugin } from './containers/App/actions';
import { showNotification } from './containers/NotificationProvider/actions';
import { showNotification as showNewNotification } from './containers/NewNotification/actions';

import basename from './utils/basename';
import injectReducer from './utils/injectReducer';
import injectSaga from './utils/injectSaga';
import Strapi from './utils/Strapi';

// Import root component
import App from './containers/App';
// Import Language provider
import LanguageProvider from './containers/LanguageProvider';

import configureStore from './configureStore';
import { SETTINGS_BASE_URL } from './config';

// Import i18n messages
import { translationMessages, languages } from './i18n';

import history from './utils/history';

import plugins from './plugins';

// Retry on 504 (Gateway Timeout): the tenant Lambda backends occasionally hit
// a concurrent cold-start race (multiple containers contending for the same
// SQLite file - SQLITE_BUSY) where the Lambda crashes before doing any work
// at all, surfaced to the browser as a 504. That's almost always transient -
// a follow-up request a few seconds later succeeds once one container wins.
//
// Also retries on a *rejected* fetch, not just a resolved 504: API Gateway's
// own gateway-generated error responses (this same 504, plus throttles etc.)
// never reach Strapi, so its CORS middleware never adds the usual headers -
// the browser then discards the cross-origin response as a CORS failure and
// fetch() rejects instead of resolving with the status code, invisible to
// the `response.status === 504` check below. (The per-tenant CloudFormation
// template's GatewayResponseDefault4xx/5xx now add a CORS header to those
// gateway-generated responses too, so this should mostly stop happening -
// this is a second, independent safety net for whatever slips through, e.g.
// a genuinely dropped connection that never got any response to add headers
// to in the first place.)
//
// Installed once, globally, here at the app's entry point (before anything
// else runs) rather than inside strapi-helper-plugin's request() - that
// package only ships a prebuilt dist bundle with no source to patch, and
// request() calls window.fetch directly, so wrapping fetch here covers every
// request() call (and any other direct fetch caller) with zero changes to
// strapi-helper-plugin or any of its hundreds of call sites.
//
// Note: this retries every method, including POST/PUT/DELETE. A 504 (or a
// rejected fetch) here has only ever been observed as "the Lambda crashed
// before it did anything" (see above), not "the write succeeded but the
// response was lost" - but that's this app's specific failure mode, not a
// general guarantee, so it's worth knowing if this ever gets reused
// somewhere with different backend behavior.
const RETRY_DELAYS_MS = [2000, 4000, 8000];
const nativeFetch = window.fetch.bind(window);

const attemptFetch = (...args) =>
  nativeFetch(...args).then(
    response => ({ response }),
    error => ({ error })
  );

window.fetch = async (...args) => {
  let { response, error } = await attemptFetch(...args);

  for (
    let i = 0;
    (error || response.status === 504) && i < RETRY_DELAYS_MS.length;
    i += 1
  ) {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[i]));
    ({ response, error } = await attemptFetch(...args));
  }

  if (error) {
    throw error;
  }

  return response;
};

const strapi = Strapi();

const pluginsReducers = {};
const pluginsToLoad = [];

Object.keys(plugins).forEach(current => {
  const registerPlugin = plugin => {
    strapi.registerPlugin(plugin);

    return plugin;
  };
  const currentPluginFn = plugins[current];

  // By updating this by adding required methods
  // to load a plugin you need to update this file
  // strapi-generate-plugins/files/admin/src/index.js needs to be updated
  const plugin = currentPluginFn({
    registerComponent: strapi.componentApi.registerComponent,
    registerField: strapi.fieldApi.registerField,
    registerPlugin,
    settingsBaseURL: SETTINGS_BASE_URL || '/settings',
    middlewares: strapi.middlewares,
  });

  const pluginTradsPrefixed = languages.reduce((acc, lang) => {
    const currentLocale = plugin.trads[lang];

    if (currentLocale) {
      const localeprefixedWithPluginId = Object.keys(currentLocale).reduce((acc2, current) => {
        acc2[`${plugin.id}.${current}`] = currentLocale[current];

        return acc2;
      }, {});

      acc[lang] = localeprefixedWithPluginId;
    }

    return acc;
  }, {});

  // Retrieve all reducers
  const pluginReducers = plugin.reducers || {};

  Object.keys(pluginReducers).forEach(reducerName => {
    pluginsReducers[reducerName] = pluginReducers[reducerName];
  });

  try {
    merge(translationMessages, pluginTradsPrefixed);
    pluginsToLoad.push(plugin);
  } catch (err) {
    console.log({ err });
  }
});

const initialState = {};
const store = configureStore(initialState, pluginsReducers, strapi);
const { dispatch } = store;

// Load plugins, this will be removed in the v4, temporary fix until the plugin API
// https://plugin-api-rfc.vercel.app/plugin-api/admin.html
pluginsToLoad.forEach(plugin => {
  const bootPlugin = plugin.boot;

  if (bootPlugin) {
    bootPlugin(strapi);
  }

  dispatch(pluginLoaded(plugin));
});

// TODO
const remoteURL = (() => {
  // Relative URL (ex: /dashboard)
  if (REMOTE_URL[0] === '/') {
    return (window.location.origin + REMOTE_URL).replace(/\/$/, '');
  }

  return REMOTE_URL.replace(/\/$/, '');
})();

const displayNotification = (message, status) => {
  console.warn(
    // Validate the text
    'Deprecated: Will be deleted.\nPlease use strapi.notification.toggle(config).\nDocs : https://strapi.io/documentation/developer-docs/latest/development/local-plugins-customization.html#strapi-notification'
  );
  dispatch(showNotification(message, status));
};
const displayNewNotification = config => {
  dispatch(showNewNotification(config));
};
const lockApp = data => {
  dispatch(freezeApp(data));
};
const unlockApp = () => {
  dispatch(unfreezeApp());
};

const lockAppWithOverlay = () => {
  const overlayblockerParams = {
    children: <div />,
    noGradient: true,
  };

  lockApp(overlayblockerParams);
};

window.strapi = Object.assign(window.strapi || {}, {
  node: MODE || 'host',
  env: NODE_ENV,
  remoteURL,
  backendURL: 'https://' + window.location.hostname.replace('-admin',''),
  notification: {
    // New notification api
    toggle: config => {
      displayNewNotification(config);
    },
    success: message => {
      displayNotification(message, 'success');
    },
    warning: message => {
      displayNotification(message, 'warning');
    },
    error: message => {
      displayNotification(message, 'error');
    },
    info: message => {
      displayNotification(message, 'info');
    },
  },
  refresh: pluginId => ({
    translationMessages: translationMessagesUpdated => {
      render(merge({}, translationMessages, translationMessagesUpdated));
    },
    leftMenuSections: leftMenuSectionsUpdated => {
      store.dispatch(updatePlugin(pluginId, 'leftMenuSections', leftMenuSectionsUpdated));
    },
  }),
  router: history,
  languages,
  currentLanguage:
    window.localStorage.getItem('strapi-admin-language') ||
    window.navigator.language ||
    window.navigator.userLanguage ||
    'en',
  lockApp,
  lockAppWithOverlay,
  unlockApp,
  injectReducer,
  injectSaga,
  store,
});

const MOUNT_NODE = document.getElementById('app') || document.createElement('div');

const render = messages => {
  ReactDOM.render(
    <Provider store={store}>
      <StrapiProvider strapi={strapi}>
        <Fonts />
        <LanguageProvider messages={messages}>
          <BrowserRouter basename={basename}>
            <App store={store} />
          </BrowserRouter>
        </LanguageProvider>
      </StrapiProvider>
    </Provider>,
    MOUNT_NODE
  );
};

if (module.hot) {
  module.hot.accept(['./i18n', './containers/App'], () => {
    ReactDOM.unmountComponentAtNode(MOUNT_NODE);

    render(translationMessages);
  });
}

if (NODE_ENV !== 'test') {
  render(translationMessages);
}

// @Pierre Burgy exporting dispatch for the notifications...
export { dispatch };
