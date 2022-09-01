import theme from '@styles/theme';
import CancelAndConfirmButton from '@ui/common/Button/CancelAndConfirmButton';
import Circle from '@ui/common/Loading/Circle';
import GhostButtons from '@ui/common/Loading/GhostButtons';
import Round from '@ui/common/Loading/Round';
import Spinner from '@ui/common/Loading/Spinner';
import Typography from '@ui/common/Typography';
import React from 'react';
import styled from 'styled-components';
import failedIcon from '../../../../assets/failed.svg';

interface LoadingProps {
  loading: boolean;
}

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  position: relative;
  width: 100%;
  height: 492px;
  padding-top: 24px;
  .absolute-buttons {
    position: absolute;
    bottom: 24px;
    padding: 0px 20px;
  }
`;

const ApproveTransactionLoading = () => {
  return (
    <>
      <Circle width='80px' height='80px' bgColor={theme.color.neutral[6]} margin='24px 0px' />
      <Round height='41px' radius='30px' bgColor={theme.color.neutral[6]} margin='0px 0px 46px'>
        <Typography type='body2Reg' color={theme.color.neutral[3]}>
          https://gno.land
        </Typography>
      </Round>
      <Spinner />
    </>
  );
};

export default ApproveTransactionLoading;
