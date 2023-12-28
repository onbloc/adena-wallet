import styled from 'styled-components';

import { fonts, getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

export const AdditionalTokenSearchListWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  max-height: 240px;

  .scroll-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    width: 100%;
    overflow-y: auto;
  }

  .no-content {
    display: flex;
    width: 100%;
    margin: 40px auto 180px auto;
    color: ${getTheme('neutral', 'a')};
    ${fonts.body1Reg};
    justify-content: center;
    align-items: center;
  }
`;

export const AdditionalTokenSearchListItemWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'normal', justify: 'space-between' })};
  width: 100%;
  height: auto;
  padding: 14px 15px;
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${getTheme('neutral', '_7')};
  }

  .title {
    display: inline-block;
    flex-shrink: 0;
    max-width: calc(100% - 140px);
    color: ${getTheme('neutral', '_1')};
    ${fonts.body2Reg};

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 3px;
    }
  }

  .path {
    display: inline-block;
    flex-shrink: 0;
    max-width: 140px;
    color: ${getTheme('neutral', 'a')};
    ${fonts.body2Reg}
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
