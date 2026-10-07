/* eslint-disable consistent-return */
import produce from 'immer';
import {
  SET_CT_OR_ST_LINKS,
  SET_SECTION_LINKS,
  TOGGLE_IS_LOADING,
  UNSET_IS_LOADING,
} from './constants';

const initialState = {
  collectionTypesSectionLinks: [],
  // Modules (list-plugins), Marketplace, and Settings links removed from the
  // left nav's general section - LeftMenu/index.js skips rendering that
  // section entirely once this is empty, and getGeneralLinks.js's
  // settings-link lookup already returns [] when it finds none, so this is
  // a self-contained change with no other call sites to update.
  generalSectionLinks: [],
  singleTypesSectionLinks: [],
  pluginsSectionLinks: [],
  isLoading: true,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case SET_CT_OR_ST_LINKS: {
        const { authorizedCtLinks, authorizedStLinks } = action.data;
        draftState.collectionTypesSectionLinks = authorizedCtLinks;
        draftState.singleTypesSectionLinks = authorizedStLinks;
        break;
      }

      case SET_SECTION_LINKS: {
        const { authorizedGeneralLinks, authorizedPluginLinks } = action.data;
        draftState.generalSectionLinks = authorizedGeneralLinks;
        draftState.pluginsSectionLinks = authorizedPluginLinks;
        break;
      }

      case TOGGLE_IS_LOADING: {
        draftState.isLoading = !state.isLoading;
        break;
      }
      case UNSET_IS_LOADING: {
        draftState.isLoading = false;
        break;
      }

      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
