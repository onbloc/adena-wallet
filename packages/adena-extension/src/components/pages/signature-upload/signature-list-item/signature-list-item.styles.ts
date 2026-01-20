import styled from 'styled-components';
import { fonts } from '@styles/theme';

export const StyledSignerItemWrapper = styled.div<{ borderColor: string }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 18px;
  border: 2px solid ${({ borderColor }): string => borderColor};
  background-color: ${({ theme }): string => theme.neutral._9};
  transition: border-color 0.2s;

  .logo-wrapper {
    position: relative;
    flex-shrink: 0;

    .logo {
      ${fonts.body2Bold};
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background-color: ${({ theme }): string => theme.neutral._5};
      color: ${({ theme }): string => theme.white};
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
    }
  }

  .title-wrapper {
    display: flex;
    flex-direction: column;
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
  display: inline-flex;
  width: 14px;
  height: 14px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;

  svg {
    width: 100%;
    height: 100%;

    line {
      transition: 0.2s;
      stroke: ${({ theme }): string => theme.neutral.a};
    }
  }

  &:hover {
    svg {
      line {
        stroke: ${({ theme }): string => theme.neutral._1};
      }
    }
  }
`;
