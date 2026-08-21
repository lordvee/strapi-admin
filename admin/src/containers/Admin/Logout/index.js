/**
 *
 * Logout
 *
 */

/* eslint-disable */
import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { withRouter } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { get } from 'lodash';
import { auth } from 'strapi-helper-plugin';
import Wrapper from './components';

const Logout = ({ history: { push } }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleGoToMe = () => {
    push({
      pathname: `/me`,
    });
  };

  const handleLogout = () => {
    auth.clearAppStorage();
    push('/auth/login');
  };

  const toggle = () => setIsOpen(prev => !prev);

  const userInfo = auth.getUserInfo();
  const displayName =
    userInfo && userInfo.firstname && userInfo.lastname
      ? `${userInfo.firstname} ${userInfo.lastname}`
      : get(userInfo, 'username', '');

  return (
    <Wrapper>
      <ButtonDropdown isOpen={isOpen} toggle={toggle} direction="down">
        <DropdownToggle>
          {displayName}
          <FontAwesomeIcon icon="caret-down" />
        </DropdownToggle>
        {/* flip={false}: this toggle lives in a position:fixed, top:0 navbar with
            no room above it. Popper's flip modifier was misjudging available space
            in that context and auto-flipping the menu to open upward, pushing it to
            negative Y coordinates - technically "visible" (not display:none, correct
            z-index) but rendered entirely off-screen above the viewport. Popper's
            translate3d offset stayed wrong (and got worse under positionFixed) even
            after this, so components.js also forces static CSS positioning below,
            overriding Popper's transform outright rather than fighting its popper.js
            v1 coordinate math in this nested-fixed-position navbar. */}
        <DropdownMenu className="dropDownContent" flip={false}>
          <DropdownItem onClick={handleGoToMe} className="item">
            <FormattedMessage id="app.components.Logout.profile" />
          </DropdownItem>
          <DropdownItem onClick={handleLogout}>
            <FormattedMessage id="app.components.Logout.logout" />
            <FontAwesomeIcon icon="sign-out-alt" />
          </DropdownItem>
        </DropdownMenu>
      </ButtonDropdown>
    </Wrapper>
  );
};

export default withRouter(Logout);
