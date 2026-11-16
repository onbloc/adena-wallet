import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import AccountNameInput, { AccountNameInputProps } from '.';

describe('AccountNameInput Component', () => {
  it('AccountNameInput render', () => {
    const args: AccountNameInputProps = {
      originName: '',
      name: '',
      setName: () => {
        return;
      },
      reset: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AccountNameInput {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
