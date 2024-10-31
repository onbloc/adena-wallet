import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTTransferInput, { NFTTransferInputProps } from './nft-transfer-input';

describe('NFTTransferInput Component', () => {
  it('NFTTransferInput render', () => {
    const args: NFTTransferInputProps = {
      grc721Token: {
        metadata: null,
        name: '',
        networkId: '',
        packagePath: '',
        symbol: '',
        tokenId: '',
        type: 'grc721',
        isMetadata: true,
        isTokenUri: true,
      },
      queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
      addressInput: {
        opened: false,
        hasError: false,
        errorMessage: 'Invalid address',
        selected: false,
        selectedName: '',
        selectedDescription: '(g1ff...jpae)',
        address: '',
        addressBookInfos: [],
        onClickInputIcon: () => {
          return;
        },
        onChangeAddress: () => {
          return;
        },
        onClickAddressBook: () => {
          return;
        },
      },
      memoInput: {
        memo: '',
        onChangeMemo: () => {
          return;
        },
      },
      isNext: true,
      hasBackButton: true,
      onClickBack: () => {
        return;
      },
      onClickCancel: () => {
        return;
      },
      onClickNext: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTTransferInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
