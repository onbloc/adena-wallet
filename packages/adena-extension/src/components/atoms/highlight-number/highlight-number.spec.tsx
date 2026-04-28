import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import { HighlightNumber, HighlightNumberProps } from '.';

function renderHighlight(props: HighlightNumberProps): ReturnType<typeof render> {
  return render(
    <RecoilRoot>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <HighlightNumber {...props} />
      </ThemeProvider>
    </RecoilRoot>,
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
