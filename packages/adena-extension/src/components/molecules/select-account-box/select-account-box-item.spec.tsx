import React from 'react';
import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import SelectAccountBoxItem from './select-account-box-item';

describe('SelectAccountBoxItem Component', () => {
  const args = {
    account: {
      index: 1,
      address: 'address',
      hdPath: 1,
      stored: false,
      selected: false,
    },
    select: (): void => {
      return;
    },
  };

  it('SelectAccountBoxItem render', () => {
    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <SelectAccountBoxItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
