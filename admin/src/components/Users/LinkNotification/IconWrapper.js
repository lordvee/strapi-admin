import styled from 'styled-components';
import { Flex } from '@punch-in/buffet-modern-core';

const IconWrapper = styled(Flex)`
  height: 100%;
  margin-right: 18px;
  transform: rotate(-20deg);
`;

IconWrapper.defaultProps = {
  flexDirection: 'column',
  justifyContent: 'center',
};

export default IconWrapper;
