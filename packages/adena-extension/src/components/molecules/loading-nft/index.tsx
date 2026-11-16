import { ReactElement } from 'react';
import styled from 'styled-components';

import { Loading, SkeletonBoxStyle } from '@components/atoms';
import mixins from '@styles/mixins';

const Wrapper = styled.div`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  position: relative;
  width: 100%;
  gap: 16px;
`;

const ListBoxWrap = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })}
  width: 100%;
  gap: 16px;
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-end', justify: 'space-between' })}
  width: 100%;
  aspect-ratio: 1;
  flex: 1;
  padding: 10px;
`;

const NftRowBox = (): ReactElement => {
  return (
    <ListBoxWrap>
      {Array.from({ length: 2 }, (v, i) => (
        <SkeletonBox key={i}>
          <Loading.Round width='100%' height='20px' radius='8px' />
        </SkeletonBox>
      ))}
    </ListBoxWrap>
  );
};

export const LoadingNft = (): ReactElement => {
  return (
    <Wrapper>
      {Array.from({ length: 2 }, (v, i) => (
        <NftRowBox key={i} />
      ))}
    </Wrapper>
  );
};
