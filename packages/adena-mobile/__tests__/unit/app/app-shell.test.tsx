import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { Text } from 'react-native';

import { AppShell } from '../../../src/app/app-shell';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { createWrapper } from '../../helpers/query-wrapper';
import { wrapPage } from '../components/pages/render-page';

// Stands in for the native stacks and shows which one the status selects.
function MockRootNavigator(): ReactElement {
  const status = useSessionStore(state => state.status);

  return <Text>{`status:${status}`}</Text>;
}

jest.mock('../../../src/navigation/root-navigator', () => ({ RootNavigator: MockRootNavigator }));

describe('AppShell', () => {
  const getStatus = jest.fn();

  const setup = () => {
    const { Wrapper, client } = createWrapper({ walletService: { getStatus, lock: jest.fn() } });

    return { client, view: render(wrapPage(<Wrapper><AppShell /></Wrapper>)) };
  };

  beforeEach(() => {
    getStatus.mockReset();
    useSessionStore.setState({ status: SessionStatus.BOOTING });
  });

  it('hydrates the session status from the wallet', async () => {
    getStatus.mockResolvedValue(SessionStatus.LOCKED);
    await setup().view;

    expect(await screen.findByText('status:locked')).toBeTruthy();
  });

  it('shows a retryable failure instead of a blank screen when the status cannot be read', async () => {
    getStatus.mockRejectedValueOnce(new Error('Keychain unavailable'));
    await setup().view;

    expect(await screen.findByText('Adena could not start')).toBeTruthy();
    expect(screen.getByText('Keychain unavailable')).toBeTruthy();

    getStatus.mockResolvedValue(SessionStatus.EMPTY);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('status:empty')).toBeTruthy();
  });

  it('does not let a refetch after a cache clear override a later status', async () => {
    getStatus.mockResolvedValue(SessionStatus.UNLOCKED);
    const { client, view } = setup();

    await view;
    await screen.findByText('status:unlocked');
    getStatus.mockResolvedValue(SessionStatus.EMPTY);
    await act(async () => {
      client.clear();
      useSessionStore.getState().setStatus(SessionStatus.LOCKED);
    });

    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByText('status:locked')).toBeTruthy();
  });
});
