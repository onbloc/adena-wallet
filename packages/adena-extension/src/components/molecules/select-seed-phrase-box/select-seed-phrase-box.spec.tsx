import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import SelectSeedPhraseBox, { SelectSeedPhraseBoxProps } from './select-seed-phrase-box';

describe('SelectSeedPhraseBox Component', () => {
  it('SelectSeedPhraseBox render', () => {
    const args: SelectSeedPhraseBoxProps = {
      seedPhrases: [{
        index: 1,
        keyringId: 'id',
        accountCount: 1,
        selected: false,
      }],
      select: async () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <SelectSeedPhraseBox {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
