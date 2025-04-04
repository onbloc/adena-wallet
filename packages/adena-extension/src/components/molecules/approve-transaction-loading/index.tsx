import { Loading } from '@components/atoms';
import React from 'react';
import { GhostButtons } from '../ghost-button';
import {
  ApproveTransactionLoadingAllRadiusBox,
  ApproveTransactionLoadingBottomRadiusBox,
  ApproveTransactionLoadingTopRadiusBox,
  ApproveTransactionLoadingWrapper,
} from './approve-transaction-loading.styles';

export interface ApproveTransactionLoadingProps {
  leftButtonText?: string;
  rightButtonText?: string;
}

export const ApproveTransactionLoading: React.FC<ApproveTransactionLoadingProps> = ({
  leftButtonText,
  rightButtonText,
}) => {
  return (
    <ApproveTransactionLoadingWrapper>
      <Loading.Round width='163px' height='14px' radius='24px' />
      <ApproveTransactionLoadingAllRadiusBox align='center' className='domain-skeleton'>
        <Loading.Round width='100px' height='10px' radius='24px' />
      </ApproveTransactionLoadingAllRadiusBox>
      <ApproveTransactionLoadingTopRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='100px' height='10px' radius='24px' />
      </ApproveTransactionLoadingTopRadiusBox>
      <ApproveTransactionLoadingBottomRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='50px' height='10px' radius='24px' />
      </ApproveTransactionLoadingBottomRadiusBox>
      <ApproveTransactionLoadingAllRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='70px' height='10px' radius='24px' />
      </ApproveTransactionLoadingAllRadiusBox>
      <GhostButtons
        left={leftButtonText ?? 'Cancel'}
        right={rightButtonText ?? ''}
        className='l-approve'
      />
    </ApproveTransactionLoadingWrapper>
  );
};
