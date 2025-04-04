import { View } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const ApproveTransactionMessageWrapper = styled(View)`
  width: 100%;
  height: auto;
  border-radius: 18px;
  margin-bottom: 8px;
  background-color: ${getTheme('neutral', '_9')};

  .row {
    ${mixins.flex({ direction: 'row' })};
    position: relative;
    padding: 10px 18px;
    justify-content: space-between;
    border-bottom: 2px solid ${getTheme('neutral', '_8')};
    ${fonts.body1Reg};

    &:last-child {
      border-bottom: none;
    }

    &.argument {
      padding: 0 0 0 18px;
    }

    .key {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${getTheme('neutral', 'a')};
    }

    .value {
      display: block;
      max-width: 204px;
      text-align: right;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .realm-wrapper {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }

    & .link-wrapper {
      display: inline-flex;
      width: 14px;
      height: 14px;
      justify-content: center;
      align-items: center;
      cursor: pointer;

      &:hover {
        svg {
          path {
            fill: ${getTheme('neutral', '_1')};
          }
        }
      }
    }
  }
`;

export const ApproveTransactionMessageArgumentsOpenerWrapper = styled(View)`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  height: auto;
  color: ${getTheme('neutral', 'a')};
  padding: 14px 18px;
  ${fonts.body1Bold};

  & .title-wrapper {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
    width: 100%;
    flex-shrink: 0;
    gap: 4px;
    cursor: pointer;
    user-select: none;

    & .title {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${getTheme('neutral', '_1')};
    }

    & .arrow-icon {
      ${mixins.flex({ direction: 'row' })};
      width: 16px;
      height: 16px;
    }
  }
`;

export const RealmPathInfoWrapper = styled.span`
  display: block;
  max-width: 157px;
  text-align: right;
  text-overflow: ellipsis;
  overflow: hidden;
  ${fonts.body1Reg};
  direction: rtl;
  color: ${getTheme('neutral', 'a')};

  & .namespace-path {
    color: ${getTheme('neutral', '_1')};
    font-weight: 400;
  }

  & .contract {
    color: ${getTheme('neutral', '_1')};
    font-weight: 700;
  }
`;
