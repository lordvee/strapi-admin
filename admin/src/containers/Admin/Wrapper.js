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
    left:6rem;
    top: 6rem;
    width: calc(100vw - 5rem);
    overflow-y: auto;
    height: calc(100vh - 6rem - 1px);
    z-index: 5;

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
