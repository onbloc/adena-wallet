import React, { ReactElement } from 'react';
import styled, { CSSProp } from 'styled-components';
import { Loading } from '@components/atoms';

const Wrapper = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  position: relative;
  width: 100%;
  margin-top: 13px;
  gap: 12px;
`;

const SkeletonBox = styled(Loading.SkeletonBoxStyle)`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'center')}
  width: 100%;
  height: 60px;
`;

const LoadingChangeNetwork = (): ReactElement => {
  return (
    <Wrapper>
      {Array.from({ length: 4 }, (v, i) => (
        <SkeletonBox key={i}>
          <Loading.Round width='58px' height='10px' radius='24px' />
          <Loading.Round width='134px' height='10px' radius='24px' margin='10px 0px 0px' />
        </SkeletonBox>
      ))}
    </Wrapper>
  );
};

export default LoadingChangeNetwork;
