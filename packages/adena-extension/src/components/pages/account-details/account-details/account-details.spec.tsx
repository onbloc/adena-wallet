import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import AccountDetails, { AccountDetailsProps } from '.';

describe('AccountDetails Component', () => {
  const defaultArgs: AccountDetailsProps = {
    hasPrivateKey: true,
    hasSeedPhrase: true,
    hasSessions: false,
    originName: '',
    name: '',
    address: '',
    isSessionAccount: false,
    moveGnoscan: () => {
      return;
    },
    moveRevealSeedPhrase: () => {
      return;
    },
    moveExportPrivateKey: () => {
      return;
    },
    moveManageSessions: () => {
      return;
    },
    setName: () => {
      return;
    },
    reset: () => {
      return;
    },
  };

  const renderAccountDetails = (args: Partial<AccountDetailsProps> = {}): void => {
    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AccountDetails {...defaultArgs} {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  };

  it('AccountDetails render', () => {
    renderAccountDetails();
  });

  it('does not show Session Accounts when there are no sessions', () => {
    renderAccountDetails({ hasSessions: false });

    expect(screen.queryByText('Session Accounts')).toBeNull();
  });

  it('shows Session Accounts when sessions exist', () => {
    renderAccountDetails({ hasSessions: true });

    expect(screen.getByText('Session Accounts')).toBeTruthy();
  });
});
