import React, { ReactElement } from 'react';
import styled, { CSSProp } from 'styled-components';
import { Circle, GhostButtons, Round } from '@components/loadings';
import { SkeletonBoxStyle } from '@components/loadings';

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'stretch')};
  position: relative;
  width: 100%;
  height: 492px;
  padding: 29px 24px 0px;
`;

const RoundsBox = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-end', 'center')};
  margin-left: auto;
`;

const ListBoxWrap = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')}
  width: 100%;
  gap: 12px;
  margin-top: 31px;
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'flex-start')}
  width: 100%;
  height: 60px;
`;

const LoadingWallet = (): ReactElement => {
  return (
    <Wrapper>
      {/* <Header /> */}
      <Round width='163px' height='14px' radius='24px' />
      <Round width='91px' height='14px' radius='24px' margin='36px 0px 31px' />
      <GhostButtons left='Deposit' right='Send' />
      <ListBoxWrap>
        {Array.from({ length: 3 }, (v, i) => (
          <SkeletonBox key={i}>
            <Circle width='34px' height='34px' margin='0px 15px 0px 0px' />
            <Round width='91px' height='10px' radius='24px' />
            <RoundsBox>
              <Round width='100px' height='10px' radius='24px' />
              <Round width='58px' height='10px' radius='24px' margin='10px 0px 0px' />
            </RoundsBox>
          </SkeletonBox>
        ))}
      </ListBoxWrap>
      {/* <Navigation /> */}
    </Wrapper>
  );
};

export default LoadingWallet;
