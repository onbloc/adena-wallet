import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import AdditionalTokenPathInput, {
  AdditionalTokenPathInputProps,
} from './additional-token-path-input';

describe('AdditionalTokenPathInput Component', () => {
  it('AdditionalTokenPathInput render', () => {
    const args: AdditionalTokenPathInputProps = {
      keyword: '',
      onChangeKeyword: () => {
        return;
      },
      errorMessage: 'error',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenPathInput {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
