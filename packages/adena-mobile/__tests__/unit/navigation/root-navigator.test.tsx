import { render, screen } from '@testing-library/react-native';
import React, { PropsWithChildren, ReactElement } from 'react';

import { RootNavigator } from '../../../src/navigation/root-navigator';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';

// Each stack screen renders its route name, so the test reads the registered routes without mounting pages.
jest.mock('@react-navigation/native-stack', () => {
  const { Text } = jest.requireActual('react-native');

  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: PropsWithChildren): ReactElement => children as ReactElement,
      Screen: ({ name }: { name: string }): ReactElement => <Text testID='route'>{name}</Text>,
    }),
  };
});

const routes = (): string[] => screen.queryAllByTestId('route').map(node => String(node.props.children));

describe('RootNavigator', () => {
  it('registers every main route, including search, profile and buy', async () => {
    useSessionStore.setState({ status: SessionStatus.UNLOCKED });
    await render(<RootNavigator />);

    expect(routes()).toHaveLength(29);
    expect(routes()).toEqual(expect.arrayContaining(['Search', 'EditProfile', 'BuyCrypto', 'Checkout', 'AccountSettings', 'AddToken']));
  });

  it('mounts only the stack of the session status', async () => {
    useSessionStore.setState({ status: SessionStatus.LOCKED });
    await render(<RootNavigator />);
    expect(routes()).toEqual(['Splash', 'Unlock', 'ResetWallet']);
  });

  it('holds the launch logo while the wallet status is read', async () => {
    useSessionStore.setState({ status: SessionStatus.BOOTING });
    await render(<RootNavigator />);
    expect(screen.getByLabelText('Adena')).toBeTruthy();
    expect(routes()).toEqual([]);
  });

  it('starts onboarding without the splash when there is no wallet', async () => {
    useSessionStore.setState({ status: SessionStatus.EMPTY });
    await render(<RootNavigator />);
    expect(routes()).toEqual(['Welcome', 'BackupPhrase', 'ImportWallet', 'CreatePassword']);
  });
});
