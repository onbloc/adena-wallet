import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebMainHeader } from '.';

describe('MainHeader Component', () => {
  it('MainHeader render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebMainHeader
            currentStep={1}
            stepLength={4}
            onClickGoBack={(): void => { return; }}
          />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});