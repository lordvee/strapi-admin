import styled from 'styled-components';
import { Flex } from '@punch-in/buffet-modern-core';

const CollapseLabel = styled(Flex)`
  padding-right: 10px;
  overflow: hidden;
  flex: 1;
  ${({ isCollapsable }) => isCollapsable && 'cursor: pointer;'}
`;

export default CollapseLabel;
