import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import { WebSeedBox } from '.';

describe('WebSeedBox Component', () => {
  it('WebSeedBox render', () => {
    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebSeedBox seedString='' />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
