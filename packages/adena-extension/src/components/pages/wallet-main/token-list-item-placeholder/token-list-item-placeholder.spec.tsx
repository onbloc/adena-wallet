import React from 'react';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TokenListItemPlaceholder from './token-list-item-placeholder';

const renderPlaceholder = (): ReturnType<typeof render> =>
  render(
    <>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <TokenListItemPlaceholder />
      </ThemeProvider>
    </>,
  );

describe('TokenListItemPlaceholder Component', () => {
  it('renders without crashing', () => {
    renderPlaceholder();
  });

  // The wrapper is a column holding `.item-row`; skeleton pieces left as its
  // direct children stack vertically instead of laying out as a row.
  it('nests the skeleton pieces inside the row so they lay out horizontally', () => {
    const { container } = renderPlaceholder();

    const row = container.querySelector('.item-row');
    expect(row).not.toBeNull();

    for (const cell of ['.logo-wrapper', '.name-wrapper', '.balance-wrapper']) {
      const element = container.querySelector(cell);
      expect(element).not.toBeNull();
      expect(element?.parentElement).toBe(row);
    }
  });
});
