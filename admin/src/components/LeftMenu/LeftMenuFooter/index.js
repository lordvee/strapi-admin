/**
 *
 * LeftMenuFooter
 *
 */

import React from 'react';
import { PropTypes } from 'prop-types';
import Wrapper, { A } from './Wrapper';

function LeftMenuFooter({ version }) {
  // PROJECT_TYPE is an env variable defined in the webpack config
  // eslint-disable-next-line no-undef
  const projectType = PROJECT_TYPE;

  return (
    <Wrapper>
      <div className="poweredBy">
        <A key="website" href="https://www.punch-in.co.uk" target="_blank" rel="noopener noreferrer">
          Punch-in
        </A>
        &nbsp;
        <A
          href={`"https://www.punch-in.co.uk"`}
          key="github"
          target="_blank"
          rel="noopener noreferrer"
        >
          v{version}
        </A>
        &nbsp;
        <A href="https://www.punch-in.co.uk" target="_blank" rel="noopener noreferrer">
          — General Edition
        </A>
      </div>
    </Wrapper>
  );
}

LeftMenuFooter.propTypes = {
  version: PropTypes.string.isRequired,
};

export default LeftMenuFooter;
