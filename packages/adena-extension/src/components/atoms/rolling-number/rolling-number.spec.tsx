import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import RollingNumber from '.';

describe('RollingNumber Component', () => {
  it('RollingNumber render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <RollingNumber
            type='body1'
            value={1}
          />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});