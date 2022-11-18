import theme from '@styles/theme';
import { Circle, Round, Spinner } from '@components/loadings';
import Text from '@components/text';
import React from 'react';
import styled from 'styled-components';

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

const ApproveMainLoading = () => {
  return (
    <>
      <Circle width='80px' height='80px' bgColor={theme.color.neutral[6]} margin='24px 0px' />
      <Round height='41px' radius='30px' bgColor={theme.color.neutral[6]} margin='0px 0px 46px'>
        <Text type='body2Reg' color={theme.color.neutral[3]}>
          https://gno.land
        </Text>
      </Round>
      <Spinner />
    </>
  );
};

export default ApproveMainLoading;
