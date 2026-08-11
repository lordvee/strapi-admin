import styled from 'styled-components';

const NavTopRightWrapper = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  display: flex;
  background-color: #007eff;
  color: #fff;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 6px 18px #002f5f52;
  /* Must outrank .adminPageRightWrapper (z-index: 5, see containers/Admin/Wrapper.js) and
     the LeftMenu sidebar (z-index: 10) - otherwise the Logout dropdown menu that pops out
     of this bar renders underneath the main content area and is invisible/unclickable. */
  z-index: 15;
`;

export default NavTopRightWrapper;
