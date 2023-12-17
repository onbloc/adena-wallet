import React, { ReactElement } from 'react';
import styled, { CSSProp } from 'styled-components';
import { Loading } from '@components/atoms';

const Wrapper = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  position: relative;
  width: 100%;
`;

const RoundsBox = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-end', 'center')};
  margin-left: auto;
`;

const ListBoxWrap = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')}
  width: 100%;
  gap: 12px;
  padding-top: 12px;
`;

const SkeletonBox = styled(Loading.SkeletonBoxStyle)`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'flex-start')}
  width: 100%;
  height: 60px;
`;

const LoadingTokenDetails = (): ReactElement => {
  return (
    <Wrapper>
      <Loading.Round width='91px' height='14px' radius='24px' />
      <ListBoxWrap>
        {Array.from({ length: 2 }, (v, i) => (
          <SkeletonBox key={i}>
            <Loading.Circle width='34px' height='34px' margin='0px 15px 0px 0px' />
            <Loading.Round width='91px' height='10px' radius='24px' />
            <RoundsBox>
              <Loading.Round width='100px' height='10px' radius='24px' />
              <Loading.Round width='58px' height='10px' radius='24px' margin='10px 0px 0px' />
            </RoundsBox>
          </SkeletonBox>
        ))}
      </ListBoxWrap>
    </Wrapper>
  );
};

export default LoadingTokenDetails;
