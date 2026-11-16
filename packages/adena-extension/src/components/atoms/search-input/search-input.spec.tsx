import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { SearchInput, SearchInputProps } from '.';

describe('SearchInput Component', () => {
  it('SearchInput render', () => {
    const args: SearchInputProps = {
      keyword: 'as',
      onChangeKeyword: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SearchInput {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
