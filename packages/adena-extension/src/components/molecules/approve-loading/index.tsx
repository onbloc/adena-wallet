import React from 'react';
import {
  ApproveLoadingAllRadiusBox,
  ApproveLoadingBottomRadiusBox,
  ApproveLoadingSkeletonBox,
  ApproveLoadingTopRadiusBox,
  ApproveLoadingWrapper,
} from './approve-loading.styles';
import { Loading } from '@components/atoms';
import { GhostButtons } from '../ghost-button';

export interface ApproveLoadingProps {
  leftButtonText?: string;
  rightButtonText?: string;
}

export const ApproveLoading: React.FC<ApproveLoadingProps> = ({
  leftButtonText,
  rightButtonText,
}) => {
  return (
    <ApproveLoadingWrapper>
      <Loading.Round width='163px' height='14px' radius='24px' />
      <ApproveLoadingSkeletonBox />
      <ApproveLoadingAllRadiusBox align='center'>
        <Loading.Round width='100px' height='10px' radius='24px' />
      </ApproveLoadingAllRadiusBox>
      <ApproveLoadingTopRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='100px' height='10px' radius='24px' />
      </ApproveLoadingTopRadiusBox>
      <ApproveLoadingBottomRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='50px' height='10px' radius='24px' />
      </ApproveLoadingBottomRadiusBox>
      <ApproveLoadingAllRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='70px' height='10px' radius='24px' />
      </ApproveLoadingAllRadiusBox>
      <GhostButtons
        left={leftButtonText ?? 'Cancel'}
        right={rightButtonText ?? ''}
        className='l-approve'
      />
    </ApproveLoadingWrapper>
  );
};
