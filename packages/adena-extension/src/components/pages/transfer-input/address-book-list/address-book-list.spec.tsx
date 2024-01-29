import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import AddressBookList, { AddressBookListProps } from './address-book-list';

describe('AddressBookList Component', () => {
  it('AddressBookList render', () => {
    const args: AddressBookListProps = {
      addressBookInfos: [
        {
          addressBookId: '1',
          description: '(g1uh...ohno)',
          name: 'Account 1',
        },
      ],
      onClickItem: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AddressBookList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
