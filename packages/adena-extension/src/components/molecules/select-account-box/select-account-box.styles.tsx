import { Row, View } from '@components/atoms';
import styled, { keyframes } from 'styled-components';

export const StyledSelectAccountBox = styled(View)``;

export const StyledSelectAccountContent = styled(View)`
  display: block;
  width: 552px;
  max-height: 266px;
  overflow-y: auto;
  background-color: #14161a;
  border-radius: 12px;

  ::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera*/
  }
`;

export const StyledLoadMore = styled(Row)<{ disabled: boolean }>`
  justify-content: center;
  padding: 8px 0;
  gap: 4px;

  cursor: pointer;
  &:disabled {
    cursor: not-allowed;
  }
`;

export const KeyframeRotate = keyframes`
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`;

export const StyledLoadingWrapper = styled(View)`
  justify-content: center;
  align-items: center;
  animation: ${KeyframeRotate} 1.5s infinite;
`;
