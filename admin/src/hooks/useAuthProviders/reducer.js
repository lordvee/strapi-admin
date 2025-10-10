import { initialState } from './initialState';

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA':
      return {
        ...state,
        isLoading: true,
      };
    case 'GET_DATA_SUCCEEDED':
      return {
        ...state,
        data: action.data,
        isLoading: false,
      };
    case 'GET_DATA_ERROR':
      return {
        ...state,
        isLoading: false,
      };
    default:
      return state;
  }
};

export default reducer;
export { initialState };











