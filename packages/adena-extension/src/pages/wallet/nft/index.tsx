import theme from '@styles/theme';
import Text from '@components/text';
import React, { useState } from 'react';
import styled, { CSSProp } from 'styled-components';
import LoadingNft from '@components/loading-screen/loading-nft';

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  background-color: ${({ theme }): string => theme.color.neutral[7]};
  .desc {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
`;

export const Nft = (): JSX.Element => {
  const [state, setState] = useState('FINISH');
  const [datas] = useState([]);

  return (
    <Wrapper>
      <Text type='header4'>NFTs</Text>
      {state === 'FINISH' ? (
        datas.length > 0 ? (
          datas.map((item, idx) => <></>)
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
