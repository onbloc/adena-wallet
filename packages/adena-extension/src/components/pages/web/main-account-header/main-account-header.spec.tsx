import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebMainAccountHeader } from '.';

describe('WebMainAccountHeader Component', () => {
  it('WebMainAccountHeader render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebMainAccountHeader
            account={null}
            onClickGoBack={(): void => { return; }}
          />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});