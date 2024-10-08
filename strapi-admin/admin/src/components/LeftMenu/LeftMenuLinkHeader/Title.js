import styled from 'styled-components';

const Title = styled.div`
  display: flex;
  justify-content: space-between;
  padding-left: 0.1rem;
  padding-right: 0.6rem;
  padding-top: 1rem;
  margin-bottom: 0.9rem;
  color: ${props => props.theme.main.colors.leftMenu['title-color']};
  text-transform: uppercase;
  font-size: 1.1rem;
  letter-spacing: 0.1rem;
  font-weight: 800;
  max-height: 26px;
  overflow: hidden;
`;

Title.defaultProps = {
  theme: {
    main: {
      colors: {
        leftMenu: {
          'title-color': '#5b626f',
        },
      },
    },
  },
};

export default Title;
