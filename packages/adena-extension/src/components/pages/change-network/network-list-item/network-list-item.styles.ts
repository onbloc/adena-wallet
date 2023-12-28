import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NetworkListItemWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  padding: 9px 16px;
  background-color: ${getTheme('neutral', '_7')};
  border-radius: 18px;
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${getTheme('neutral', 'b')};
  }

  .info-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    width: 100%;
    font-size: 12px;
    font-weight: 600;
    line-height: 21px;

    .name-wrapper {
      ${mixins.flex({ direction: 'row', justify: 'normal' })};

      .name {
        display: block;
        max-width: 236px;
        color: ${getTheme('neutral', '_1')};

        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .icon-wrapper {
        display: flex;
        margin-left: 7px;

        & svg {
          width: 12px;
          height: 12px;
        }

        & .icon-edit {
          path {
            transition: 0.2s;
            fill: ${getTheme('neutral', 'a')};
          }

          &:hover {
            path {
              fill: ${getTheme('neutral', '_1')};
            }
          }
        }
      }
    }

    .description-wrapper {
      ${mixins.flex({ direction: 'row', justify: 'normal' })};

      .description {
        display: block;
        max-width: 244px;
        color: ${getTheme('neutral', 'a')};
        font-weight: 400;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .selected-wrapper {
    display: flex;
    flex-shrink: 0;
    width: 24px;
    padding: 4px;
    justify-content: center;
    align-items: center;

    .icon-check {
      width: 16px;
      height: 16px;
    }
  }
`;
