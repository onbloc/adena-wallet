import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { HighlightNumber, HighlightNumberProps } from '.';

function renderHighlight(props: HighlightNumberProps): ReturnType<typeof render> {
  return render(
    <JotaiProvider>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <HighlightNumber {...props} />
      </ThemeProvider>
    </JotaiProvider>,
  );
}

describe('HighlightNumber Component', () => {
  it('HighlightNumber render', () => {
    renderHighlight({ value: '123,456,789.123456' });
  });

  it('passes a non-numeric placeholder through without producing NaN', () => {
    renderHighlight({ value: '-' });

    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getByText('-')).not.toBeNull();
  });
});
