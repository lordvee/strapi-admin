import styled from 'styled-components';
import PropTypes from 'prop-types';
//background: ${props => props.theme.main.colors.strapi['blue-darker']};
const Wrapper = styled.div`
  position: absolute;
  width: 100%;
  background: rgb(0, 126, 255);
  bottom: 0;
  .poweredBy {
    width: 100%;
    bottom: 0;
    height: 3rem;
    padding-left: 15px;
    padding-right: 15px;
    line-height: 3rem;
    background-color: rgba(255, 255, 255, 0.02);
    font-size: 1rem;
    font-weight: 400;
    letter-spacing: 0.05rem;
    vertical-align: middle;
    color: ${({ theme }) => theme.main.colors['white']};
  }
`;

const A = styled.a`
  color: #FFF;
  &:hover {
    color: rgb(255, 227, 0);
    text-decoration: underline;
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
export { A };
