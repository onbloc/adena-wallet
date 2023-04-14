import React from 'react';
import { ThemeProvider } from 'styled-components';
import { RecoilRoot } from 'recoil';
import type { Decorator, Parameters } from '@storybook/react';
import { GlobalStyle } from '../src/styles/global-style';
import theme from '../src/styles/theme';

export const parameters: Parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

export const decorators: Decorator[] = [
  (Story, context) => {
    return (
      <>
        <GlobalStyle />
        <RecoilRoot>
          <ThemeProvider theme={theme}>
            <Story />
          </ThemeProvider>
        </RecoilRoot>
      </>
    );
  },
];
