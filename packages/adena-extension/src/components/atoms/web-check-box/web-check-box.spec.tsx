import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebCheckBox } from '.';

describe('WebCheckBox Component', () => {
  it('WebCheckBox render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebCheckBox checked />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});