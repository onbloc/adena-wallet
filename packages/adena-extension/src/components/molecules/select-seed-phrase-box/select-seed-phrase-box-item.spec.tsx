import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';

import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';

import SelectSeedPhraseBoxItem from './select-seed-phrase-box-item';

describe('SelectSeedPhraseBoxItem Component', () => {
  const args = {
    seedPhrase: {
      index: 1,
      keyringId: 'id',
      accountCount: 1,
      selected: false,
    },
    select: (): void => {
      return;
    },
  };

  it('SelectSeedPhraseBoxItem render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <SelectSeedPhraseBoxItem {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
