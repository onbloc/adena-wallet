import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebButton } from '.';

describe('WebButton Component', () => {
  it('WebButton render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebButton
            figure='primary'
            size='small'
            text='WebButton'
          />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});