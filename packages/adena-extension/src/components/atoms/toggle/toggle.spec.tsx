import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <Toggle {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
