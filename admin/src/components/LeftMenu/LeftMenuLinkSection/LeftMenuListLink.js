import styled from 'styled-components';

const LeftMenuListLink = styled.div`
  /* No fixed height: sections share the menu's height and each scrolls
     on its own, so later sections are never pushed below the viewport. */
  flex: 0 1 auto;
  min-height: 0;
  /* The Plugins (modules) section never shrinks, so all its items stay
     visible; the long collection/single type lists give up space instead.
     The cap only kicks in on very small screens, where it scrolls. */
  ${({ section }) => (section === 'plugins' ? 'flex-shrink: 0; max-height: 60%;' : '')}
  margin-bottom: 19px;
  overflow-y: hidden;
  width: 22rem;
  &:hover {
    overflow-y: auto;
  }
`;

export default LeftMenuListLink;
