import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import { WebImg } from '.';

describe('WebImg Component', () => {
  it('WebImg render', () => {
    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebImg src='https://adena.app/assets/images/favicon.svg' />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
