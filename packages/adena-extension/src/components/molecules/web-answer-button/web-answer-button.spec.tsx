import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import WebAnswerButton from './web-answer-button';

describe('WebAnswerButton Component', () => {
  it('WebAnswerButton render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebAnswerButton
            correct
            selected
            answer='answer'
            onClick={(): void => { return; }}
          />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
