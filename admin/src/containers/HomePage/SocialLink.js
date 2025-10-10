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
      return (<FontAwesomeIcon icon={['fab', 'facebook']} size="lg" />);
    case 'LinkedIn':
      return (<FontAwesomeIcon icon={['fab', 'linkedin']} size="lg" />);
    case 'Careers':
      return (<FontAwesomeIcon icon={['fab', 'linkedin']} size="lg" color="#4199e1" />);
    default:
      return (<FontAwesomeIcon icon={['fab', 'linkedin']} size="lg" />);
  }
}

const SocialLink = ({ link, name }) => {
  return (
    <SocialLinkWrapper className="col-6">
      <a href={link} target="_blank" rel="noopener noreferrer">
        {getSrc(name)}
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
