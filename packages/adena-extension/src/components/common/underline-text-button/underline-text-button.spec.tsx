import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import UnderlineTextButton, { UnderlineTextButtonProps } from './underline-text-button';

describe('UnderlineTextButton Component', () => {
  it('UnderlineTextButton render', () => {
    const args: UnderlineTextButtonProps = {
      text: '',
      onClick: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <UnderlineTextButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});