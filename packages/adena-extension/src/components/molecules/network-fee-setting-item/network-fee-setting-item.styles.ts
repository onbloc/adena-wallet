import { SkeletonBoxStyle, View } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NetworkFeeItemSkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-start' })};
  width: 55px;
  height: 14px;
  align-self: center;
`;

export const NetworkFeeSettingItemWrapper = styled(View)`
  ${mixins.flex({ direction: 'row', align: 'normal', justify: 'space-between' })};
  display: flex;
  width: 100%;
  padding: 14px 16px;
  gap: 8px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 8px;
  transition: 0.2s;
  cursor: pointer;

  &.selected,
  &:hover {
    background-color: ${getTheme('neutral', '_7')};
  }

  & .title {
    ${mixins.flex({ direction: 'row' })};
    flex-shrink: 0;
    color: ${getTheme('neutral', '_1')};
    ${fonts.body1Bold}
  }

  & .no-data {
    ${fonts.body1Reg}
    color: ${getTheme('neutral', '_3')};
  }
`;
