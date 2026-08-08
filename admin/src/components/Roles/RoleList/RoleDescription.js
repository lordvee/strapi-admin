import React from 'react';
import styled from 'styled-components';
import { Text } from '@punch-in/buffet-modern-core';

const RoleDescription = styled(props => <Text {...props} ellipsis />)`
  max-width: 25rem;
`;

export default RoleDescription;
