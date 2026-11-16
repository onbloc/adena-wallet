import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
