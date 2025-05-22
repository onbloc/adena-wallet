import { View } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';
import styled from 'styled-components';

export const AccountInitializationInitWrapper = styled(View)`
  width: 100%;
  height: auto;
  padding: 24px 20px;
  gap: 24px;

  .image-wrapper {
    ${mixins.flex({ align: 'center', justify: 'center' })};
    width: 100%;
    height: auto;

    img {
      width: 80px;
      height: 80px;
    }
  }

  .content-wrapper {
    ${mixins.flex({ direction: 'column', align: 'center', justify: 'center' })};
    width: 100%;
    height: auto;
    gap: 20px;

    .address-box {
      ${mixins.flex({ align: 'center', justify: 'center' })};
      width: 100%;
      min-height: 41px;
      padding: 10px;
      border-radius: 24px;
      color: ${({ theme }): string => theme.neutral._1};
      background-color: ${({ theme }): string => theme.neutral._9};
      ${fonts.body2Reg}
    }

    .warning-box {
      display: flex;
      width: 100%;
      padding: 12px 16px;
      align-items: flex-start;
      gap: 10px;
      border-radius: 8px;
      background: rgba(255, 165, 60, 0.2);
      color: #ffa53c;
      ${fonts.body2Reg}
    }
  }
`;
