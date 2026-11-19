// Shared constants
import { fromJS } from 'immutable';
import packageJSON from '../../../../package.json';

import {
  DISABLE_GLOBAL_OVERLAY_BLOCKER,
  ENABLE_GLOBAL_OVERLAY_BLOCKER,
  FREEZE_APP,
  GET_INFOS_DATA_SUCCEEDED,
  GET_DATA_SUCCEEDED,
  PLUGIN_DELETED,
  PLUGIN_LOADED,
  UNFREEZE_APP,
  UPDATE_PLUGIN,
} from './constants';

const packageVersion = packageJSON.version;
const initialState = fromJS({
  appInfos: {},
  autoReload: false,
  blockApp: false,
  currentEnvironment: 'development',
  hasAdminUser: false,
  hasUserPlugin: true,
  isLoading: true,
  locales: [],
  overlayBlockerData: null,
  plugins: {},
  showGlobalAppBlocker: true,
  strapiVersion: packageVersion,
  uuid: false,
});

// Same state changes whether the infos come from `/admin/information` or from `/admin/init`
const applyInfos = (state, infos) =>
  state
    .update('appInfos', () => infos)
    // Keep this for plugins legacy
    .update('autoReload', () => infos.autoReload)
    .update('currentEnvironment', () => infos.currentEnvironment);

function appReducer(state = initialState, action) {
  switch (action.type) {
    case DISABLE_GLOBAL_OVERLAY_BLOCKER:
      return state.set('showGlobalAppBlocker', false);
    case ENABLE_GLOBAL_OVERLAY_BLOCKER:
      return state.set('showGlobalAppBlocker', true);
    case FREEZE_APP:
      return state.set('blockApp', true).update('overlayBlockerData', () => {
        if (action.data) {
          return action.data;
        }

        return null;
      });
    case GET_INFOS_DATA_SUCCEEDED: {
      // if (action.data.strapiVersion !== state.get('strapiVersion')) {
      //   console.error(
      //     `It seems that the built version ${packageVersion} is different than your project's one (${action.data.strapiVersion})`
      //   );
      //   console.error('Please delete your `.cache` and `build` folders and restart your app');
      // }

      return applyInfos(state, action.data);
    }
    case GET_DATA_SUCCEEDED: {
      const nextState = state
        .update('isLoading', () => false)
        .update('hasAdminUser', () => action.data.hasAdmin)
        .update('uuid', () => action.data.uuid)
        .update('locales', () => fromJS(action.data.locales || []));

      // `/admin/init` embeds the `/admin/information` payload when the request is authenticated
      return action.data.information ? applyInfos(nextState, action.data.information) : nextState;
    }
    case PLUGIN_LOADED:
      return state.setIn(['plugins', action.plugin.id], fromJS(action.plugin));
    case UPDATE_PLUGIN:
      return state.setIn(
        ['plugins', action.pluginId, action.updatedKey],
        fromJS(action.updatedValue)
      );
    case PLUGIN_DELETED:
      return state.deleteIn(['plugins', action.plugin]);
    case UNFREEZE_APP:
      return state.set('blockApp', false).set('overlayBlockerData', null);

    default:
      return state;
  }
}

export default appReducer;
