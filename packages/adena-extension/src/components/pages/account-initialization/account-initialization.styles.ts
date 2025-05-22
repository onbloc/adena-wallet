import { View } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';
import styled from 'styled-components';

export const AccountInitializationWrapper = styled(View)`
  width: 100%;
  height: auto;

  .address-wrapper {
    ${mixins.flex({ align: 'center', justify: 'center' })};
    width: 100%;
    height: 100%;
    padding: 10px;
    border-radius: 24px;
    color: ${({ theme }): string => theme.neutral._1};
    background-color: ${({ theme }): string => theme.neutral._9};
    ${fonts.body2Reg}
  }
`;
