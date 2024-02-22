import React, { ReactElement } from 'react';
import styled from 'styled-components';

import { Loading, SkeletonBoxStyle, Text } from '@components/atoms';
import mixins from '@styles/mixins';
import plus from '@assets/plus.svg';
import { CloseShadowButton } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';

const LoadingAddressBook = (): ReactElement => {
  const { goBack } = useAppNavigate();

  return (
    <Wrapper>
      <TopSection>
        <Text type='header4'>Address Book</Text>
        <AddButton />
      </TopSection>

      <ListWrapper>
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonBox key={i}>
            <Loading.Round width='80px' height='10px' radius='24px' />
            <RoundsBox>
              <Loading.Round width='120px' height='10px' radius='24px' />
            </RoundsBox>
          </SkeletonBox>
        ))}
      </ListWrapper>
      <CloseShadowButton onClick={goBack} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 120px;
  .desc {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
`;

const TopSection = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  margin-bottom: 12px;
`;

const ListWrapper = styled.div`
  ${mixins.flex({ direction: 'column', justify: 'flex-start' })};
  width: 100%;
  gap: 12px;
`;

const AddButton = styled.button`
  width: 24px;
  height: 24px;
  background: url(${plus}) no-repeat center center / 100% 100%;
`;

const RoundsBox = styled.div`
  ${mixins.flex({ align: 'flex-end' })};
  margin-left: auto;
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })}
  width: 100%;
  height: 60px;
`;

export default LoadingAddressBook;
