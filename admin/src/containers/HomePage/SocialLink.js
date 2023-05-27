/**
 *
 * SocialLink
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { SocialLinkWrapper } from './components';

function getSrc(name) {
  switch (name) {
    case 'Facebook':
      return (<FontAwesomeIcon icon="fa-brands fa-square-facebook" size="lg" />);
    case 'LinkedIn':
      return (<FontAwesomeIcon icon="fa-brands fa-linkedin" size="lg" />);
    case 'Careers':
      return (<FontAwesomeIcon icon="fa-brands fa-linkedin" size="lg" color="#4199e1" />);
    default:
      return (<FontAwesomeIcon icon="fa-brands fa-linkedin" size="lg" />) />;
  }
}

const SocialLink = ({ link, name }) => {
  return (
    <SocialLinkWrapper className="col-6">
      <a href={link} target="_blank" rel="noopener noreferrer">
        <img src={getSrc(name)} alt={name} />
        <span>{name}</span>
      </a>
    </SocialLinkWrapper>
  );
};

SocialLink.propTypes = {
  link: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default memo(SocialLink);
