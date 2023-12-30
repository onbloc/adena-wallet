import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const ManageTokenSearchInputWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
  width: 100%;
  height: 48px;
  padding: 12px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 30px;
  border: 1px solid ${getTheme('neutral', '_7')};

  .search-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    align-items: center;
    padding: 0 5px;

    .search {
      width: 17px;
      height: 17px;
    }
  }

  .input-wrapper {
    display: inline-flex;
    flex-shrink: 1;
    width: 100%;
    height: 24px;
    padding: 0 12px;

    .search-input {
      width: 100%;
      ${fonts.body2Reg};
    }
  }

  .added-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    align-items: center;
    cursor: pointer;

    .added {
      width: 100%;
      height: 100%;
      fill: ${getTheme('neutral', '_7')};
      transition: 0.2s;
    }

    :hover {
      .added {
        fill: ${getTheme('neutral', 'b')};
      }
    }
  }
`;
