import { Text } from '@punch-in/buffet-modern-core';
import Chevron from '../../Chevron';

const activeStyle = theme => `
  color: ${theme.main.colors.mediumBlue};
  ${Text} {
    color: ${theme.main.colors.mediumBlue};
  }
  ${Chevron} {
    display: block;
    color: ${theme.main.colors.mediumBlue};
  }
`;

export default activeStyle;
