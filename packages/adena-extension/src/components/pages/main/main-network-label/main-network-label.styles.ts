import styled from 'styled-components';

import { View } from '@components/atoms';

export const MainNetworkLabelWrapper = styled(View)<{ $clickable?: boolean }>`
  width: 100%;
  height: auto;
  background-color: ${({ theme }): string => theme.primary._1};
  align-items: center;
  justify-content: center;
  height: 30px;
  cursor: ${({ $clickable }): string => ($clickable ? 'pointer' : 'default')};
  transition: opacity 0.2s;

  &:hover {
    opacity: ${({ $clickable }): number => ($clickable ? 0.85 : 1)};
  }
`;
