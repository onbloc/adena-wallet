import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { NetworksPage, NetworksPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<NetworksPageProps> = {}): NetworksPageProps => ({
  networks: [
    { id: 'gnoland1', name: 'Mainnet', detail: 'gnoland1', selected: false, isCustom: false, isTestnet: false },
    { id: 'test12', name: 'Testnet 12', detail: 'test12', selected: true, isCustom: false, isTestnet: true },
    { id: 'custom', name: 'My node', detail: 'http://localhost:26657', selected: false, isCustom: true, isTestnet: false },
  ],
  onSelect: jest.fn(),
  onRemove: jest.fn(),
  onAddNetwork: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('NetworksPage', () => {
  it('selects networks and adds a custom one', async () => {
    const page = props();

    await renderPage(<NetworksPage {...page} />);

    expect(screen.getByText('Test')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mainnet, gnoland1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Testnet 12, test12' }));
    await fireEvent.press(screen.getByRole('button', { name: 'My node, http://localhost:26657' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add custom network' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect((page.onSelect as jest.Mock).mock.calls).toEqual([['gnoland1'], ['test12'], ['custom']]);
    expect(page.onRemove).not.toHaveBeenCalled();
    expect(page.onAddNetwork).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('removes the selected custom network instead of reselecting it', async () => {
    const page = props({ networks: [{ id: 'custom', name: 'My node', detail: 'local', selected: true, isCustom: true, isTestnet: false }] });

    await renderPage(<NetworksPage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'My node, local' }));

    expect(page.onRemove).toHaveBeenCalledWith('custom');
    expect(page.onSelect).not.toHaveBeenCalled();
  });

  it('renders with no networks', async () => {
    await renderPage(<NetworksPage {...props({ networks: [] })} />);

    expect(screen.getByText('Choose a network for this wallet.')).toBeTruthy();
  });
});
