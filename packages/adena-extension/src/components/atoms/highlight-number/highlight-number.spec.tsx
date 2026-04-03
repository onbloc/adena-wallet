import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import { HighlightNumber, HighlightNumberProps } from '.';

describe('HighlightNumber Component', () => {
  it('HighlightNumber render', () => {
    const args: HighlightNumberProps = { value: '123,456,789.123456' };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <HighlightNumber {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
