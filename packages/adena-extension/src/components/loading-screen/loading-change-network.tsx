import React, { ReactElement } from 'react';
import styled, { CSSProp } from 'styled-components';
import { Round } from '@components/loadings';
import { SkeletonBoxStyle } from '@components/loadings';

const Wrapper = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  position: relative;
  width: 100%;
  margin-top: 13px;
  gap: 12px;
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'center')}
  width: 100%;
  height: 60px;
`;

const LoadingChangeNetwork = (): ReactElement => {
  return (
    <Wrapper>
      {Array.from({ length: 4 }, (v, i) => (
        <SkeletonBox key={i}>
          <Round width='58px' height='10px' radius='24px' />
          <Round width='134px' height='10px' radius='24px' margin='10px 0px 0px' />
        </SkeletonBox>
      ))}
    </Wrapper>
  );
};

export default LoadingChangeNetwork;
