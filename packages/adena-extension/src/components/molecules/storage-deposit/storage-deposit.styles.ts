import { SkeletonBoxStyle } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const StorageDepositContainer = styled.div`
  ${mixins.flex({ direction: 'column', justify: 'flex-start' })};
  width: 100%;

  .error-message {
    position: relative;
    width: 100%;
    padding: 0 16px;
    ${fonts.captionReg};
    color: ${getTheme('red', '_5')};
    word-break: break-all;
  }
`;

export const StorageDepositWrapper = styled.div<{ error?: number }>`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  padding: 14px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 30px;
  ${({ error, theme }): string | false | undefined => !!error && `border-color: ${theme.red._5};`}

  & .key {
    ${mixins.flex({ direction: 'row' })};
    flex-shrink: 0;
    color: ${getTheme('neutral', 'a')};
    ${fonts.body2Reg};
    gap: 4px;
  }

  & .storage-deposit-amount-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'flex-end' })};
    width: 100%;
    gap: 3px;
  }
`;

export const StorageDepositItemSkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-start' })};
  width: 55px;
  height: 14px;
  align-self: center;
`;

export const StorageDepositIconWrapper = styled.div`
  position: relative;
  ${mixins.flex({ direction: 'row' })};
  cursor: pointer;
`;

export const StorageDepositTooltipBoxWrapper = styled.div`
  position: absolute;
  bottom: 30px;
  background-color: ${getTheme('neutral', '_8')};
  width: 300px;
  height: auto;
  border-radius: 8px;
  padding: 16px;
  color: ${getTheme('neutral', '_2')};
  ${fonts.body2Reg};
  cursor: default;

  &::after {
    content: '';
    position: absolute;
    bottom: -14px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12.5px solid transparent;
    border-right: 12.5px solid transparent;
    border-top: 14px solid ${getTheme('neutral', '_8')};
    border-radius: 0 0 4px 4px;
  }
`;
