import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
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
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SearchInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
