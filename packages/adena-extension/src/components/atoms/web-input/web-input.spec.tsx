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
  WebInput,
} from '.';

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
