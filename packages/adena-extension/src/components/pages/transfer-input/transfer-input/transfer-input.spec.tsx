import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import TransferInput, { TransferInputProps } from './transfer-input';

describe('TransferInput Component', () => {
  it('TransferInput render', () => {
    const args: TransferInputProps = {
      tokenMetainfo: {
        main: true,
        display: false,
        tokenId: 'tokenId',
        networkId: 'DEFAULT',
        name: 'gno.land',
        image: '',
        symbol: 'GNOT',
        type: 'gno-native',
        decimals: 6,
      },
      balanceInput: {
        hasError: false,
        amount: '132123123123',
        denom: 'GNOT',
        description: 'Insufficient balance',
        onChangeAmount: () => {
          return;
        },
        onClickMax: () => {
          return;
        },
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
          <TransferInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
