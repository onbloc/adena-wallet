import React from 'react';
import { ApproveLoadingAllRadiusBox, ApproveLoadingBottomRadiusBox, ApproveLoadingSkeletonBox, ApproveLoadingTopRadiusBox, ApproveLoadingWrapper } from './approve-loading.styles';
import { GhostButtons, Round } from '@components/loadings';

export interface ApproveLoadingProps {
  leftButtonText?: string;
  rightButtonText?: string;
}

const ApproveLoading: React.FC<ApproveLoadingProps> = ({
  leftButtonText,
  rightButtonText
}) => {
  return (
    <ApproveLoadingWrapper>
      <Round width='163px' height='14px' radius='24px' />
      <ApproveLoadingSkeletonBox />
      <ApproveLoadingAllRadiusBox align='center'>
        <Round width='100px' height='10px' radius='24px' />
      </ApproveLoadingAllRadiusBox>
      <ApproveLoadingTopRadiusBox>
        <Round width='65px' height='10px' radius='24px' />
        <Round width='100px' height='10px' radius='24px' />
      </ApproveLoadingTopRadiusBox>
      <ApproveLoadingBottomRadiusBox>
        <Round width='65px' height='10px' radius='24px' />
        <Round width='50px' height='10px' radius='24px' />
      </ApproveLoadingBottomRadiusBox>
      <ApproveLoadingAllRadiusBox>
        <Round width='65px' height='10px' radius='24px' />
        <Round width='70px' height='10px' radius='24px' />
      </ApproveLoadingAllRadiusBox>
      <GhostButtons
        left={leftButtonText ?? 'Cancel'}
        right={rightButtonText ?? ''}
        className='l-approve'
      />
    </ApproveLoadingWrapper>
  );
};

export default ApproveLoading;