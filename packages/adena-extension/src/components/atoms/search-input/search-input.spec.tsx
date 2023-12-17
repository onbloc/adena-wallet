import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
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
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <SearchInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
