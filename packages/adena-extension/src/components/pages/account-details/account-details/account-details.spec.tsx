import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AccountDetails {...defaultArgs} {...args} />
        </ThemeProvider>
      </RecoilRoot>,
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
