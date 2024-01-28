import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebPrivateKeyBox } from '.';

describe('WebPrivateKeyBox Component', () => {
  it('WebPrivateKeyBox render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebPrivateKeyBox privateKey='privateKey' showBlur />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});