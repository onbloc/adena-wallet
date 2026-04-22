import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const ChainGroupSectionWrapper = styled.div`
  width: 100%;
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-header {
    ${mixins.flex({ direction: 'row', justify: 'space-between' })};
    padding: 0 4px 8px;

    .chain-name {
      color: ${getTheme('neutral', '_1')};
      font-size: 14px;
      font-weight: 600;
      line-height: 21px;
    }

    .add-button {
      ${mixins.flex({ direction: 'row', justify: 'center' })};
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: 0.2s;

      &:hover {
        opacity: 0.8;
      }

      .plus-icon {
        width: 24px;
        height: 24px;
      }
    }
  }

  .empty {
    padding: 12px 16px;
    text-align: center;
    color: ${getTheme('neutral', 'a')};
    font-size: 12px;
  }
`;
