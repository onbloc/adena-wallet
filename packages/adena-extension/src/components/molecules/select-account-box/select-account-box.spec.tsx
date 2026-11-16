import React from 'react';
import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import SelectAccountBox, { SelectAccountBoxProps } from './select-account-box';

describe('SelectAccountBox Component', () => {
  it('SelectAccountBox render', () => {
    const args: SelectAccountBoxProps = {
      accounts: [],
      isLoading: false,
      loadAccounts: async () => {
        return;
      },
      select: async () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <SelectAccountBox {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
