import styled from 'styled-components';

import { View } from '@components/atoms';

export const MainNetworkLabelWrapper = styled(View)`
  width: 100%;
  height: auto;
  background-color: ${({ theme }): string => theme.primary._1};
  align-items: center;
  justify-content: center;
  height: 30px;
`;
