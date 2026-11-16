import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import Toggle, { ToggleProps } from '.';

describe('Toggle Component', () => {
  it('Toggle render', () => {
    const args: ToggleProps = {
      activated: true,
      onToggle: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <Toggle {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
