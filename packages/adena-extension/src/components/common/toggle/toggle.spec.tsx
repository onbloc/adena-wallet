import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import Toggle, { ToggleProps } from './toggle';

describe('Toggle Component', () => {
  it('Toggle render', () => {
    const args: ToggleProps = {
      activated: true,
      onToggle: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <Toggle {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});