import theme, { fonts } from '@styles/theme';
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
    background-color: ${theme.color.neutral[8]};
    border: 1px solid ${theme.color.neutral[6]};
    border-radius: 30px;
    align-items: center;

    .selected-title-wrapper {
      width: 100%;
      .name {
        font-weight: 600;
      }
      .description {
        margin-left: 5px;
        color: ${theme.color.neutral[9]};
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
        color: ${theme.color.neutral[9]};
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
    background-color: ${theme.color.neutral[6]};
    border-radius: 15px;
    align-items: center;
    transition: 0.2s;
    cursor: pointer;

    :hover {
      background-color: ${theme.color.neutral[11]};
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
    border: 1px solid ${theme.color.neutral[6]};
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
      border-color: ${theme.color.red[2]};
    }

    .list-wrapper {
      border-color: ${theme.color.red[2]};
      border-top-color: ${theme.color.neutral[6]};
    }
  }

  .error-message {
    position: relative;
    padding: 0 16px;
    ${fonts.captionReg};
    color: ${theme.color.red[2]};
  }
`;
