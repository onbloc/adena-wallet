import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import AddressInput, { AddressInputProps } from './address-input';

describe('AddressInput Component', () => {
  it('AddressInput render', () => {
    const args: AddressInputProps = {
      opened: false,
      hasError: false,
      errorMessage: 'Invalid address',
      selected: false,
      selectedName: 'Account 1',
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
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AddressInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
