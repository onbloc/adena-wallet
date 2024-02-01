import styled from 'styled-components';

import { Pressable, View } from '@components/atoms';

export const StyledWrapper = styled(View)`
  width: 100%;
`;

export const StyledHeaderWrapper = styled(View)`
  gap: 12px;
  justify-content: center;
  align-items: center;
`;

export const StyledUploadWrapper = styled(View)`
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

export const StyledHelpWrapper = styled(Pressable)`
  flex-direction: row;
  gap: 6px;
  justify-content: center;
  align-items: center;
`;
