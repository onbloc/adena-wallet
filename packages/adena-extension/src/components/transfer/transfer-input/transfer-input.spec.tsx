import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TransferInput, { TransferInputProps } from './transfer-input';

describe('TransferInput Component', () => {
  it('TransferInput render', () => {
    const args: TransferInputProps = {
      tokenMetainfo: {
        main: true,
        tokenId: 'Gnoland',
        name: 'Gnoland',
        chainId: 'GNOLAND',
        networkId: 'test3',
        image: '',
        pkgPath: '',
        symbol: 'GNOT',
        type: 'NATIVE',
        decimals: 6,
        denom: 'GNOT',
        minimalDenom: 'ugnot',
      },
      balanceInput: {
        hasError: false,
        amount: '132123123123',
        denom: 'GNOT',
        description: 'Insufficient balance',
        onChangeAmount: () => { return; },
        onClickMax: () => { return; },
      },
      addressInput: {
        opened: false,
        hasError: false,
        errorMessage: 'Invalid address',
        selected: false,
        selectedName: '',
        selectedDescription: '(g1ff...jpae)',
        address: '',
        addressBookInfos: [],
        onClickInputIcon: () => { return; },
        onChangeAddress: () => { return; },
        onClickAddressBook: () => { return; },
      },
      isNext: true,
      onClickCancel: () => { return; },
      onClickNext: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TransferInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});