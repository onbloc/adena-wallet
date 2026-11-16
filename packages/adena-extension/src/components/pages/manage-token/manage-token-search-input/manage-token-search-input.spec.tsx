import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
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
