import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const ApproveChangingNetworkItemWrapper = styled.div`
  ${mixins.flex()};
  width: 80px;
  height: auto;

  img {
    display: flex;
    width: 80px;
    height: 80px;
    margin-bottom: 15px;
  }

  .chain-name-wrapper {
    display: flex;
    width: 100px;
    padding: 5px 8px;
    background-color: ${getTheme('neutral', '_9')};
    border-radius: 8px;
    text-align: center;
    justify-content: center;

    .chain-name {
      display: -webkit-box;
      width: 100%;
      color: ${getTheme('neutral', '_1')};
      ${fonts.body2Reg};
      font-weight: 500;
      text-align: center;
      justify-content: center;
      word-break: break-word;
      text-overflow: ellipsis;
      overflow: hidden;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
  }
`;
