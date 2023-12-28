import React, { useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { Text } from '@components/atoms';
import { LoadingNft } from '@components/molecules';
import { getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  background-color: ${getTheme('neutral', '_8')};
  .desc {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
`;

export const Nft = (): JSX.Element => {
  const theme = useTheme();
  const [state] = useState('FINISH');
  const [datas] = useState([]);

  return (
    <Wrapper>
      <Text type='header4'>NFTs</Text>
      {state === 'FINISH' ? (
        datas.length > 0 ? (
          datas.map(() => <></>)
        ) : (
          <Text className='desc' type='body1Reg' color={theme.neutral.a}>
            No NFTs to display
          </Text>
        )
      ) : (
        <LoadingNft />
      )}
    </Wrapper>
  );
};
