import styled from 'styled-components';
import { View } from '@components/atoms';
import { fonts } from '@styles/theme';

export const StyledWrapper = styled(View)`
  width: 100%;
`;

export const StyledInputLabel = styled.label`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100px;
  gap: 7px;
  justify-content: center;
  align-items: center;
  border-radius: 18px;
  border: 1px solid ${({ theme }): string => theme.neutral._7};
  background: ${({ theme }): string => theme.neutral._9};
  color: ${({ theme }): string => theme.neutral.a};
  transition: 0.2s;
  cursor: pointer;

  .icon {
    transition: 0.2s;
    fill: ${({ theme }): string => theme.neutral.a};
  }

  &:hover {
    color: ${({ theme }): string => theme.neutral._1};
    .icon {
      fill: ${({ theme }): string => theme.neutral._1};
    }
  }
`;

export const StyledHiddenInput = styled.input`
  display: none;
`;

export const StyledSignerListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
`;

export const StyledSignerItemWrapper = styled.div<{ borderColor: string }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 2px solid ${({ borderColor }): string => borderColor};
  background-color: ${({ theme }): string => theme.neutral._9};
  transition: border-color 0.2s;

  .logo-wrapper {
    position: relative;
    flex-shrink: 0;

    .logo {
      ${fonts.body2Bold};
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: ${({ theme }): string => theme.neutral._8};
      color: ${({ theme }): string => theme.neutral.a};
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 20px;
      height: 20px;
    }
  }

  .title-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;

    .title {
      ${fonts.body2Bold};
      color: ${({ theme }): string => theme.neutral._1};
      display: flex;
      align-items: center;
      gap: 4px;

      .info {
        flex-shrink: 0;
      }

      .link-button {
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
        color: ${({ theme }): string => theme.neutral.a};
        transition: color 0.2s;

        &:hover {
          color: ${({ theme }): string => theme.neutral._1};
        }
      }
    }

    .description {
      ${fonts.body3Reg};
      color: ${({ theme }): string => theme.neutral.a};
      display: flex;
      align-items: center;
      gap: 4px;

      .copy-button {
        flex-shrink: 0;
      }
    }
  }
`;

export const StyledRemoveButton = styled.button`
  background: ${({ theme }): string => theme.red.a};
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    opacity: 0.8;
  }
`;
