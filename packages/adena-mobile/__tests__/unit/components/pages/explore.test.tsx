import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ExplorePage } from '../../../../src/components/pages';
import { renderPage } from './render-page';

describe('ExplorePage', () => {
  it('renders svg, raster and unknown logos and opens apps', async () => {
    const onOpenApp = jest.fn();
    const apps = [
      { id: 'gnoswap', name: 'Gnoswap', description: 'DEX', logo: 'gnoswap', host: 'gnoswap.io' },
      { id: 'akkadia', name: 'Akkadia', description: 'Game', logo: 'akkadia', host: 'akkadia.io' },
      { id: 'unknown', name: 'Unknown', description: 'Mystery', logo: 'nope', host: 'example.com' },
    ];

    await renderPage(<ExplorePage apps={apps} onOpenApp={onOpenApp} />);

    expect(screen.getByText('Explore')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Gnoswap, DEX, gnoswap.io' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Akkadia, Game, akkadia.io' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Unknown, Mystery, example.com' }));
    expect(onOpenApp.mock.calls).toEqual([['gnoswap'], ['akkadia'], ['unknown']]);
  });

  it('renders with no apps', async () => {
    await renderPage(<ExplorePage apps={[]} onOpenApp={jest.fn()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
