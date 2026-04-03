import {
  describe, it,
} from 'vitest';
import {
  GlobalPopupStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';

import AddressInput, {
  AddressInputProps,
} from './address-input';

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
