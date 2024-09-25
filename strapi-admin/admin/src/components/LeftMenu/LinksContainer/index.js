import styled from 'styled-components';
import PropTypes from 'prop-types';

const LinksContainer = styled.div`
  padding-top: 0.7rem;
  position: fixed;
  top: ${props => props.theme.main.sizes.leftMenu.height};
  z-index: 20;
  overflow: hidden;
  right: 0;
  bottom: 0;
  left: 0;
  box-sizing: border-box;
  width: 6rem;
  background: ${props => props.theme.main.colors.strapi['light-blue-transparent']};
  transition: width 0.3s ease-out, visibility 0s, opacity 0.3s linear;
  &:hover {
    width: 22rem;
  }
  &:hover .hidetext {
    display: inline;
  }
`;

LinksContainer.defaultProps = {
  theme: {
    main: {
      sizes: {
        header: {},
        leftMenu: {},
      },
    },
  },
};

LinksContainer.propTypes = {
  theme: PropTypes.object,
};

export default LinksContainer;
