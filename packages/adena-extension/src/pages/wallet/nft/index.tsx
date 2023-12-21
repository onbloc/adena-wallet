import React, { useState } from 'react';
import styled from 'styled-components';

import { Text } from '@components/atoms';
import { LoadingNft } from '@components/molecules';
import theme from '@styles/theme';
import mixins from '@styles/mixins';

const Wrapper = styled.main`
  ${mixins.flex('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  background-color: ${theme.color.neutral[7]};
  .desc {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
`;

export const Nft = (): JSX.Element => {
  const [state] = useState('FINISH');
  const [datas] = useState([]);

  return (
    <Wrapper>
      <Text type='header4'>NFTs</Text>
      {state === 'FINISH' ? (
        datas.length > 0 ? (
          datas.map(() => <></>)
        ) : (
          <Text className='desc' type='body1Reg' color={theme.color.neutral[9]}>
            No NFTs to display
          </Text>
        )
      ) : (
        <LoadingNft />
      )}
    </Wrapper>
  );
};
