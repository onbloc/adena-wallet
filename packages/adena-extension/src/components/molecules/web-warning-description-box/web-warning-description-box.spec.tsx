import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import WebWarningDescriptionBox from './web-warning-description-box';

describe('WebWarningDescriptionBox Component', () => {
  it('WebWarningDescriptionBox render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebWarningDescriptionBox description='description' />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});