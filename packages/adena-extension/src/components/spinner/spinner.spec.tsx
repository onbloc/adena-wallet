import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import Spinner, { SpinnerProps } from './spinner';

describe('Spinner Component', () => {
  it('Spinner render', () => {
    const args: SpinnerProps = {
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <Spinner {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});