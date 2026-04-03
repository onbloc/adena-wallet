import {
  GlobalWebStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';
import {
  describe, it,
} from 'vitest';

import {
  WebMain,
} from '.';

describe('WebMain Component', () => {
  it('WebMain render', () => {
    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebMain>Web Main</WebMain>
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
