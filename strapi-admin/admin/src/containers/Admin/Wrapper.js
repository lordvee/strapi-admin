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
    left:5rem;
    width: calc(100% - 5rem);
    overflow-y: auto;
    height: 100%;
    z-index: 1;

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
