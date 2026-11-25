import { act, render } from '@testing-library/react-native';
import React from 'react';

import { AccountsScreen } from '../../../../src/containers/main/accounts-screen/accounts-screen';
import { Account } from '../../../../src/domain/account';
import { createWrapper } from '../../../helpers/query-wrapper';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../../helpers/test-container';

const mockPage: { props?: { onAddAccount: () => Promise<void> } } = {};

jest.mock('../../../../src/components/pages', () => ({
  ...jest.requireActual('../../../../src/components/pages'),
  AccountsPage: (props: { onAddAccount: () => Promise<void> }) => {
    mockPage.props = props;
    return null;
  },
}));

describe('AccountsScreen', () => {
  it('adds one account per tap even when the second tap lands before the re-render', async () => {
    const env = createTestContainer();

    await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    let finish: (account: Account) => void = () => undefined;
    const create = jest.spyOn(env.container.accountService, 'createAccount').mockImplementation(() => new Promise((resolve) => {
      finish = resolve;
    }));
    const { Wrapper } = createWrapper({ ...env.container });
    const Screen = AccountsScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

    await render(<Wrapper><Screen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} route={{ key: 'Accounts', name: 'Accounts' }} /></Wrapper>);
    const { onAddAccount } = mockPage.props!;

    // Both taps reach the same handler before React re-renders with `adding`.
    let first: Promise<void> = Promise.resolve();

    await act(async () => {
      first = onAddAccount();
      void onAddAccount();
    });
    expect(create).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish(env.container.accountService.getAccounts()[0]);
      await first;
    });
  });
});
