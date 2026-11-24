import { fireEvent, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { Text } from 'react-native';

import { AppErrorBoundary } from '../../../src/app/app-error-boundary';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { createWrapper } from '../../helpers/query-wrapper';
import { wrapPage } from '../components/pages/render-page';

let shouldThrow = true;

const Bomb = (): ReactElement => {
  if (shouldThrow) {
    throw new Error('kaboom');
  }

  return <Text>Recovered</Text>;
};

describe('AppErrorBoundary', () => {
  const lock = jest.fn();

  const setup = () => {
    const { Wrapper, client } = createWrapper({ walletService: { lock } });

    client.setQueryData(['secret'], 'cached');
    return { client, view: render(wrapPage(<Wrapper><AppErrorBoundary><Bomb /></AppErrorBoundary></Wrapper>)) };
  };

  beforeEach(() => {
    shouldThrow = true;
    lock.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('locks an unlocked wallet when a screen crashes, then reloads into the unlock flow', async () => {
    useSessionStore.setState({ status: SessionStatus.UNLOCKED });
    const { client, view } = setup();

    await view;
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.queryByText('kaboom')).toBeNull();
    expect(lock).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(['secret'])).toBeUndefined();
    expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED);

    shouldThrow = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Reload' }));
    expect(screen.getByText('Recovered')).toBeTruthy();
  });

  it('keeps the onboarding status when nothing was unlocked', async () => {
    useSessionStore.setState({ status: SessionStatus.EMPTY });
    await setup().view;

    expect(lock).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe(SessionStatus.EMPTY);
  });
});
