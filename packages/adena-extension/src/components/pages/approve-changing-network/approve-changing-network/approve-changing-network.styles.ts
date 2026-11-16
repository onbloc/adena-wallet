import mixins from '@styles/mixins';
import styled from 'styled-components';

export const ApproveChangingNetworkWrapper = styled.div`
  ${mixins.flex()};
  width: 100%;
  height: auto;
  justify-content: center;
  align-items: center;
  padding: 24px 20px;

  .title-container {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    width: 100%;
    height: 152px;
    margin-bottom: 16px;

    h4 {
      display: block;
      max-width: 100%;
      text-align: center;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      word-break: break-all;
    }

    .description-wrapper {
      display: flex;
      width: 100%;
      margin: 12px auto 0 auto;
      justify-content: center;
    }
  }

  .info-wrapper {
    ${mixins.flex({ direction: 'row', align: 'flex-start', justify: 'normal' })};
    width: fit-content;

    .icon-arrow {
      width: 24px;
      height: 24px;
      margin: 28px;
    }
  }
`;
