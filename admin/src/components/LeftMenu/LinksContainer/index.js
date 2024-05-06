import styled from 'styled-components';
import PropTypes from 'prop-types';

const LinksContainer = styled.div`
  padding-top: 0.7rem;
  position: absolute;
  top: ${props => { console.log('Heigth:',props.theme.main.sizes.leftMenu.height); return props.theme.main.sizes.leftMenu.height}};
  right: 0;
  bottom: 0;
  left: 0;
  overflow-y: auto;
  height: calc(100vh - (${props => props.theme.main.sizes.leftMenu.height} + 2rem));
  box-sizing: border-box;
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
