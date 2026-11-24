import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ConnectedAppsPage } from '../../../../src/components/pages';
import { renderPage } from './render-page';

describe('ConnectedAppsPage', () => {
  it('lists apps and disconnects the pressed one', async () => {
    const onDisconnect = jest.fn();
    const onBack = jest.fn();
    const apps = [
      { origin: 'https://gnoswap.io', name: 'Gnoswap', detail: 'Connected 2 days ago' },
      { origin: 'https://gnoscan.io', name: 'Gnoscan', detail: 'Connected today' },
    ];

    await renderPage(<ConnectedAppsPage apps={apps} onDisconnect={onDisconnect} onBack={onBack} />);

    expect(screen.getByText('2 connected apps')).toBeTruthy();
    expect(screen.getByText('Disconnecting ends the active connection.')).toBeTruthy();
    expect(screen.getByText('https://gnoscan.io')).toBeTruthy();
    expect(screen.getByText('Connected today')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Disconnect' })[1]);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onDisconnect).toHaveBeenCalledWith('https://gnoscan.io');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders an empty list', async () => {
    await renderPage(<ConnectedAppsPage apps={[]} onDisconnect={jest.fn()} onBack={jest.fn()} />);

    expect(screen.getByText('0 connected apps')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull();
  });
});
