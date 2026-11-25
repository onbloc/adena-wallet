import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ManageNftsPage, ManageNftsPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<ManageNftsPageProps> = {}): ManageNftsPageProps => ({
  collections: [
    { key: 'gnopunks', name: 'GnoPunks', countLabel: '3 items', visible: true, pinned: true },
    { key: 'gnomes', name: 'Gnomes of the very long collection name that keeps going', countLabel: '1 item', visible: false, pinned: false },
  ],
  onToggleVisible: jest.fn(),
  onTogglePinned: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('ManageNftsPage', () => {
  it('toggles pin and visibility per collection', async () => {
    const page = props();
    const longName = page.collections[1].name;

    await renderPage(<ManageNftsPage {...page} />);

    expect(screen.getByText('3 items')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Unpin GnoPunks' }));
    await fireEvent.press(screen.getByRole('button', { name: `Pin ${longName}` }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Show GnoPunks' }));
    await fireEvent.press(screen.getByRole('switch', { name: `Show ${longName}` }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onTogglePinned).toHaveBeenNthCalledWith(1, 'gnopunks', false);
    expect(page.onTogglePinned).toHaveBeenNthCalledWith(2, 'gnomes', true);
    expect(page.onToggleVisible).toHaveBeenNthCalledWith(1, 'gnopunks', false);
    expect(page.onToggleVisible).toHaveBeenNthCalledWith(2, 'gnomes', true);
    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No collectibles yet')).toBeNull();
  });

  it('shows the empty state without collections', async () => {
    await renderPage(<ManageNftsPage {...props({ collections: [] })} />);

    expect(screen.getByText('No collectibles yet')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
