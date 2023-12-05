import React, { ReactElement } from 'react';
import styled, { CSSProp } from 'styled-components';
import { Circle, Round } from '@components/loadings';
import { SkeletonBoxStyle } from '@components/loadings';

const Wrapper = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  position: relative;
  width: 100%;
  gap: 16px;
`;

const ListBoxWrap = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'flex-start')}
  width: 100%;
  gap: 16px;
  :first-child {
    margin-top: 8px;
  }
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-end', 'space-between')}
  width: 100%;
  flex: 1;
  height: 152px;
  padding: 10px;
`;

const NftRowBox = (): ReactElement => {
  return (
    <ListBoxWrap>
      {Array.from({ length: 2 }, (v, i) => (
        <SkeletonBox key={i}>
          <Round width='100%' height='20px' radius='10px' />
          <Circle width='20px' height='20px' />
        </SkeletonBox>
      ))}
    </ListBoxWrap>
  );
};

const LoadingNft = (): ReactElement => {
  return (
    <Wrapper>
      {Array.from({ length: 2 }, (v, i) => (
        <NftRowBox key={i} />
      ))}
    </Wrapper>
  );
};

export default LoadingNft;
