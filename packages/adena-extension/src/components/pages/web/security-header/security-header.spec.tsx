import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebSecurityHeader } from '.';

describe('WebSecurityHeader Component', () => {
  it('WebSecurityHeader render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebSecurityHeader
            currentStep={0}
            stepLength={2}
            visibleBackButton={true}
            onClickGoBack={(): void => { return; }}
          />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});