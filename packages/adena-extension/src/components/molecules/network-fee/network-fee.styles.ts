import { SkeletonBoxStyle } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NetworkFeeContainer = styled.div`
  ${mixins.flex({ direction: 'column', justify: 'flex-start' })};
  width: 100%;

  .error-message {
    position: relative;
    width: 100%;
    padding: 0 16px;
    ${fonts.captionReg};
    color: ${getTheme('red', '_5')};
  }
`;

export const NetworkFeeWrapper = styled.div<{ isError?: boolean }>`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  padding: 14px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 30px;
  ${({ isError, theme }): string | false | undefined => isError && `border-color: ${theme.red._5};`}

  & .key {
    ${mixins.flex({ direction: 'row' })};
    flex-shrink: 0;
    color: ${getTheme('neutral', 'a')};
    ${fonts.body2Reg};
  }

  & .network-fee-amount-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'flex-end' })};
    width: 100%;
    gap: 3px;

    & .setting-button {
      ${mixins.flex({ direction: 'row' })};
      width: 16px;
      height: 16px;
    }
  }
`;

export const NetworkFeeItemSkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-start' })};
  width: 55px;
  height: 14px;
  align-self: center;
`;
