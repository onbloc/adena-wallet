import styled from 'styled-components';
import { fonts } from '@styles/theme';

export const StyledSignerItemWrapper = styled.div<{ borderColor: string }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 2px solid ${({ borderColor }) => borderColor};
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
