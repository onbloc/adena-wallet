import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const AddressInputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;

  .input-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
    ${fonts.body2Reg};
    background-color: ${getTheme('neutral', '_9')};
    border: 1px solid ${getTheme('neutral', '_7')};
    border-radius: 30px;
    align-items: center;

    .selected-title-wrapper {
      width: 100%;
      .name {
        font-weight: 600;
      }
      .description {
        margin-left: 5px;
        color: ${getTheme('neutral', 'a')};
      }
    }

    .address-input {
      display: flex;
      width: 100%;
      height: auto;
      resize: none;
      overflow: hidden;
      line-height: 25px;

      ::placeholder {
        color: ${getTheme('neutral', 'a')};
      }
    }
  }

  .address-book-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    height: 25px;
    padding: 3px 14px;
    margin-left: 5px;
    background-color: ${getTheme('neutral', '_7')};
    border-radius: 15px;
    align-items: center;
    transition: 0.2s;
    cursor: pointer;

    :hover {
      background-color: ${getTheme('neutral', 'b')};
    }

    .address-book {
      width: 100%;
      height: 100%;
    }
  }

  .list-container {
    position: relative;
    width: 100%;
    height: 0;
  }

  .list-wrapper {
    position: absolute;
    width: 100%;
    height: auto;
    max-height: 142px;
    left: 0;
    border: 1px solid ${getTheme('neutral', '_7')};
    border-bottom-right-radius: 25px;
    border-bottom-left-radius: 25px;
    z-index: 4;
    overflow: auto;
  }

  &.opened {
    .input-wrapper {
      border-radius: 25px;
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0;
    }
  }

  &.error {
    .input-wrapper {
      border-color: ${getTheme('red', '_5')};
    }

    .list-wrapper {
      border-color: ${getTheme('red', '_5')};
      border-top-color: ${getTheme('neutral', '_7')};
    }
  }

  .error-message {
    position: relative;
    padding: 0 16px;
    ${fonts.captionReg};
    color: ${getTheme('red', '_5')};
  }
`;
