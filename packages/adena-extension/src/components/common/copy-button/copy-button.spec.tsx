import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import CopyButton, { CopyButtonProps } from './copy-button';

describe('CopyButton Component', () => {
  it('CopyButton render', () => {
    const args: CopyButtonProps = {
      copyText: 'hello'
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <CopyButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});