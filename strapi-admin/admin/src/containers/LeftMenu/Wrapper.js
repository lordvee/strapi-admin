/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  height: 100vh;
  width: 6rem;
  background: ${props => props.theme.main.colors.strapi['light-blue-transparent']};

  /* scrollbar overrides */
  * {
    ::-webkit-scrollbar {
      width: 7px;
    }

    ::-webkit-scrollbar-track,
    ::-webkit-scrollbar-track:hover {
      background-color: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background-color: ${props => props.theme.main.colors.leftMenu['title-color']};
    }

    ::-webkit-scrollbar-thumb:hover {
      background-color: ${props => props.theme.main.colors.leftMenu['link-color']};
    }

    /* firefox */
    scrollbar-color: ${props => props.theme.main.colors.leftMenu['title-color']} transparent;
  }
`;

Wrapper.defaultProps = {
  theme: {
    main: {
      colors: {
        strapi: {},
      },
      sizes: {
        header: {},
        leftMenu: {},
      },
    },
  },
};

Wrapper.propTypes = {
  theme: PropTypes.object,
};

export default Wrapper;
