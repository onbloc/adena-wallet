import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebText } from '.';

describe('WebText Component', () => {
  it('WebText render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebText
            type='title1'
            color='#000000'
            style={{}}
            textCenter
          >
            WebText
          </WebText>
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});