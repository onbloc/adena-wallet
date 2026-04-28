import React from 'react';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TokenListItemPlaceholder from './token-list-item-placeholder';

describe('TokenListItemPlaceholder Component', () => {
  it('renders without crashing', () => {
    render(
      <>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenListItemPlaceholder />
        </ThemeProvider>
      </>,
    );
  });
});
