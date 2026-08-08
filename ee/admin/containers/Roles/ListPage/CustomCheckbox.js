import { Checkbox as Base } from '@punch-in/buffet-modern-core';
import styled from 'styled-components';

const CustomCheckbox = styled(Base)`
  > label {
    margin: 0 !important;
    width: 0;
    max-width: 0;
  }
`;

export default CustomCheckbox;
