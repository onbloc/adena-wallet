import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import WebAnswerButton from './web-answer-button';

describe('WebAnswerButton Component', () => {
  it('WebAnswerButton render', () => {

    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebAnswerButton
            correct
            selected
            answer='answer'
            onClick={(): void => { return; }}
          />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});