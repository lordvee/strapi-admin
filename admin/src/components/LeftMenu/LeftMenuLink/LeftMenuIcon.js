import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const FaIcon = styled(({ small, ...props }) => <FontAwesomeIcon {...props} />)`
  position: absolute;
  top: ${({ small }) => (small ? 'calc(50% - 0.3rem)' : 'calc(50% - 0.95rem)')};
  left: ${({ small }) => (small ? '2.2rem' : '1.6rem')};
  width: ${({ small }) => (small ? 'auto' : '1.9rem')} !important;
  font-size: ${({ small }) => (small ? '.5rem' : '1.9rem')};
`;

const LeftMenuIcon = ({ icon }) => <FaIcon small={icon === 'circle'} icon={icon} />;

LeftMenuIcon.propTypes = {
  icon: PropTypes.string,
};
LeftMenuIcon.defaultProps = {
  icon: 'circle',
};

export default LeftMenuIcon;
