import styled from 'styled-components';

const A = styled.a`
  display: flex;
  position: relative;
  padding-top: 1rem;
  padding-bottom: 0.2rem;
  padding-left: 1.6rem;
  min-height: 3.6rem;
  line-height: 1.8rem;
  border-left: 3px solid transparent;
  cursor: pointer;
  color: ${props => props.theme.main.colors.leftMenu['link-color']};
  font-size: 1.4rem;
  font-weight: 500;
  letter-spacing: 0.01rem;
  text-decoration: none;
  -webkit-font-smoothing: antialiased;

  svg {
    color: ${props => props.theme.main.colors.secondaryText};
  }

  &:hover {
    color: ${props => props.theme.main.colors.mediumBlue};
    background: ${props => props.theme.main.colors.activeBackground};
    text-decoration: none;

    svg {
      color: ${props => props.theme.main.colors.mediumBlue};
    }
  }

  &:focus {
    color: ${props => props.theme.main.colors.mediumBlue};
    text-decoration: none;
  }

  &.linkActive {
    color: ${props => props.theme.main.colors.mediumBlue} !important;
    border-left: 3px solid ${props => props.theme.main.colors.mediumBlue};
    background: ${props => props.theme.main.colors.activeBackground};
    font-weight: 600;

    svg {
      color: ${props => props.theme.main.colors.mediumBlue};
    }
  }
`;

export default A;
