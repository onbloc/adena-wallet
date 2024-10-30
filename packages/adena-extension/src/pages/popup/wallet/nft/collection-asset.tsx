import styled from 'styled-components';

import NFTHeader from '@components/pages/nft/nft-header/nft-header';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  gap: 8px;
  background-color: ${getTheme('neutral', '_8')};
`;

export const NftCollectionAsset = (): JSX.Element => {
  return (
    <Wrapper>
      <NFTHeader />
    </Wrapper>
  );
};
