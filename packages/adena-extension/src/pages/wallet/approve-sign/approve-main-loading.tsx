import theme from '@styles/theme';
import { Circle, Round, Spinner } from '@components/loadings';
import Text from '@components/text';
import React from 'react';

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
