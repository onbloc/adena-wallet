import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebImg } from '.';

describe('WebImg Component', () => {
  it('WebImg render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebImg src='https://adena.app/assets/images/favicon.svg' />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});