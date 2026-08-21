import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  -webkit-font-smoothing: antialiased;
  > div {
    height: 6rem;
    width: 100%;
    line-height: 5.8rem;
    z-index: 999;
    > button,
    > button.btn {
      position: relative;
      z-index: 9;
      width: 100%;
      padding-left: 20px;
      padding-right: 20px;
      background: white;
      border: none;
      border-radius: 0;
      color: #333740;
      font-size: 14px;
      font-weight: 500;
      text-align: right;
      cursor: pointer;
      transition: background 0.2s ease-out;
      background-color: #007eff;
      color: #fff;

      &:hover,
      &:focus,
      &:active {
        color: #007eff;
        background-color: #fafafb !important;
        z-index: 9;
      }

      > i,
      > svg {
        margin-left: 10px;
        transition: transform 0.3s ease-out;

        &[alt='true'] {
          transform: rotateX(180deg);
        }
      }
    }
  }

  &:after {
    position: absolute;
    right: -1px;
    top: calc(50% - 10px);
    content: '';
    display: inline-block;
    vertical-align: middle;
    height: 20px;
    border-left: 1px solid #f3f4f4;
    transition: opacity 0.2s ease-out;
  }

  &:hover:after {
    opacity: 0;
  }

  .dropDownContent {
    /* Was 8 - lower than LeftMenu's sidebar (z-index 10) and even this
       component's own toggle button (z-index 9 above), so the open dropdown
       could render underneath either. The earlier fix (3bc5191a) raised the
       outer NavTopRightWrapper to 15 to outrank the sidebar but missed this
       nested value. */
    z-index: 1000;
    /* Popper.js (v1, via reactstrap 8's react-popper) computes a broken
       translate3d offset for this toggle - even after disabling its flip
       modifier and trying positionFixed, it still placed the menu at
       negative Y (off-screen above the viewport) or off to the right past
       the viewport edge. Forcing static positioning here overrides Popper's
       inline transform/position outright: the menu just hangs directly
       below its toggle button, which is all this fixed, always-in-the-
       same-spot navbar dropdown ever needs. */
    position: absolute !important;
    transform: none !important;
    top: 100% !important;
    left: auto !important;
    right: 0 !important;
    min-width: 190px;
    margin: 0 !important;
    padding: 0;
    line-height: 1.8rem;
    border: none !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    font-size: 14px;
    overflow: hidden;
    box-shadow: 0 1px 4px 0px rgba(40, 42, 49, 0.05);
    &:active {
      outline: 0;
    }

    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: -1px;
      width: calc(100% + 1px);
      height: 3px;
      box-shadow: 0 1px 2px 0 rgba(40, 42, 49, 0.16);
    }

    > button {
      height: 54px;
      padding: 0px 15px;
      &:hover,
      &:focus,
      &:active {
        background-color: #fafafb !important;
        border-radius: 0px;
        cursor: pointer;
        outline: 0;
      }
      &:hover,
      &:active {
        color: #333740;
      }
    }

    > button:last-child {
      color: #f75b1d;
      > i,
      svg {
        margin-left: 10px;
      }
    }
  }

  .item {
    &:active {
      color: black;
    }
    &:hover {
      background-color: #fafafb !important;
    }
  }
`;

export default Wrapper;
