import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import ManageTokenListItem, { ManageTokenListItemProps } from './manage-token-list-item';

const token = {
  tokenId: 'token1',
  logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
  name: 'Gnoland',
  symbol: 'GNOT',
  balanceAmount: {
    value: '240,255.241155',
    denom: 'GNOT',
  },
  activated: true,
};

describe('ManageTokenListItem Component', () => {
  it('ManageTokenListItem render', () => {
    const args: ManageTokenListItemProps = {
      token,
      onToggleActiveItem: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageTokenListItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
