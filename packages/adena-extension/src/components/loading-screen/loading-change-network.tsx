import React from 'react';
import styled from 'styled-components';
import { Round } from '@components/loadings';
import { SkeletonBoxStyle } from '@components/loadings';

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  position: relative;
  width: 100%;
  margin-top: 13px;
  gap: 12px;
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'center')}
  width: 100%;
  height: 60px;
`;

const LoadingChangeNetwork = () => {
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
