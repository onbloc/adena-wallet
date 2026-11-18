import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { CopyIconButton, CopyIconButtonProps } from '.';

describe('CopyButton Component', () => {
  it('CopyButton render', () => {
    const args: CopyIconButtonProps = {
      copyText: 'hello',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <CopyIconButton {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
