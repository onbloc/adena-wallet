import React from 'react';
import { ThemeProvider } from 'styled-components';
import { RecoilRoot } from 'recoil';
import type { Decorator, Parameters } from '@storybook/react-vite';
import { GlobalPopupStyle } from '../src/styles/global-style';
import theme from '../src/styles/theme';
import '../index.css';

const extensionViewport = {
  name: 'Adena Extension',
  styles: {
    width: '360px',
    height: '540px',
  },
};

export const parameters: Parameters = {
  viewport: {
    options: {
      adenaExtension: extensionViewport,
    }
  },
  backgrounds: {
    options: {
      adenaextension: {
        name: 'adenaExtension',
        value: '#212128',
      }
    }
  },
  layout: 'fullscreen',
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
        <GlobalPopupStyle />
        <RecoilRoot>
          <ThemeProvider theme={theme}>
            <div id='portal-popup'></div>
            <Story />
          </ThemeProvider>
        </RecoilRoot>
      </>
    );
  },
];

export const initialGlobals = {
  viewport: {
    value: 'adenaExtension',
    isRotated: false
  },

  backgrounds: {
    value: 'adenaextension'
  }
};
