import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebInput } from '.';

describe('WebInput Component', () => {
  it('WebInput render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebInput />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});