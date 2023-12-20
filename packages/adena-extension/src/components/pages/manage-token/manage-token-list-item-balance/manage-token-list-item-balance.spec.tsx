import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import ManageTokenListItemBalance, {
  ManageTokenListItemBalanceProps,
} from './manage-token-list-item-balance';

describe('ManageTokenListItemBalance Component', () => {
  it('ManageTokenListItemBalance render', () => {
    const args: ManageTokenListItemBalanceProps = {
      amount: {
        value: '240,255.241155',
        denom: 'GNOT',
      },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <ManageTokenListItemBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
