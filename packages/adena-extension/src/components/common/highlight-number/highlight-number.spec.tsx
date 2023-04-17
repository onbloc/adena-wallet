import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import HighlightNumber, { HighlightNumberProps } from './highlight-number';

describe('HighlightNumber Component', () => {
  it('HighlightNumber render', () => {
    const args: HighlightNumberProps = {
      value: "123,456,789.123456"
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <HighlightNumber {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});