import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import ManageTokenSearchInput, { ManageTokenSearchInputProps } from './manage-token-search-input';

describe('ManageTokenSearchInput Component', () => {
  it('ManageTokenSearchInput render', () => {
    const args: ManageTokenSearchInputProps = {
      keyword: 'as',
      onChangeKeyword: () => {
        return;
      },
      onClickAdded: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageTokenSearchInput {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
