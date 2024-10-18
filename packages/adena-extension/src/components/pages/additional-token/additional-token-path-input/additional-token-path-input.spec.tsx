import React from 'react';

import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';

import AdditionalTokenPathInput, {
  AdditionalTokenPathInputProps,
} from './additional-token-path-input';

describe('AdditionalTokenPathInput Component', () => {
  it('AdditionalTokenPathInput render', () => {
    const args: AdditionalTokenPathInputProps = {
      keyword: '',
      onChangeKeyword: () => {
        return;
      },
      errorMessage: 'error',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenPathInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
