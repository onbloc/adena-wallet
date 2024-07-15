import { Row, View } from '@components/atoms';
import styled from 'styled-components';

export const WebHelpTooltipWrapper = styled(View)`
  position: relative;
  width: fit-content;
  height: auto;
  align-items: center;
  margin-left: -50%;
`;

export const WebHelpTooltipBoxArrowWrapper = styled(View)`
  position: relative;
  z-index: 5;

  &.reverse img {
    transform: rotate(180deg);
    margin-top: -1px;
  }
`;

export const WebHelpTooltipBoxWrapper = styled(View)`
  position: relative;
  width: 100%;
  height: auto;
  padding: 20px;
  margin-top: -1.5px;
  flex-direction: column;
  align-items: flex-start;
  gap: 25px;
  border-radius: 24px;
  border: 1px solid #3f4348;
  background: #191b1e;
  backdrop-filter: blur(20px);
  z-index: 4;

  .evaluation-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }
`;

export const WebHelpTooltipEvaluation = styled(Row)`
  gap: 3px;

  .value {
    display: flex;
    flex-direction: row;

    .icon-wrapper {
      display: flex;
      width: 14px;
      height: 14px;
      justify-content: center;
      align-items: center;
      padding: 2px 0;
    }
  }
`;
