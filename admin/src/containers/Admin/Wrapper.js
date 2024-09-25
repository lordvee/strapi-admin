import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  overflow-x: hidden;

  p,
  span {
    font-family: Lato;
  }

  .adminPageRightWrapper {
    position: fixed;
    left:4rem;
    top: 6rem;
    width: ${props => `calc(100% - 4rem)`};
    z-index: 20;
  }
`;

Wrapper.defaultProps = {
  theme: {
    main: {
      sizes: {
        leftMenu: {},
      },
    },
  },
};

export default Wrapper;
