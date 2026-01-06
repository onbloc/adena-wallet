import styled from 'styled-components';
import { View } from '@components/atoms';

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

export const StyledSignatureList = styled(View)`
  gap: 8px;
  margin-top: 12px;
`;

export const StyledSignatureItem = styled(View)`
  flex-direction: row;
  align-items: center;
  padding: 12px;
  background: ${({ theme }): string => theme.neutral._8};
  border-radius: 8px;
  gap: 12px;
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
