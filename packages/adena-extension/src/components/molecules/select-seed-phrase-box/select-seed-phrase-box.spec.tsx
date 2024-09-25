import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';

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
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <SelectSeedPhraseBox {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
