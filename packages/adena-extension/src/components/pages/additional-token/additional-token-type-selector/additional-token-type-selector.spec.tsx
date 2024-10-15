import React from 'react';

import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import AdditionalTokenTypeSelector, {
  AddingType,
  AdditionalTokenTypeSelectorProps,
} from './additional-token-type-selector';

describe('AdditionalTokenTypeSelector Component', () => {
  it('AdditionalTokenTypeSelector render', () => {
    const args: AdditionalTokenTypeSelectorProps = {
      setType: () => {
        return;
      },
      type: AddingType.MANUAL,
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenTypeSelector {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
