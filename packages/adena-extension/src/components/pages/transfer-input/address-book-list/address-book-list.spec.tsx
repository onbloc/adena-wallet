import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AddressBookList {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
