import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { UnderlineTextButton, UnderlineTextButtonProps } from '.';

describe('UnderlineTextButton Component', () => {
  it('UnderlineTextButton render', () => {
    const args: UnderlineTextButtonProps = {
      text: '',
      onClick: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <UnderlineTextButton {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
