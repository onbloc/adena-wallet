// signature-upload-label.styles.ts
import styled from 'styled-components';

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
