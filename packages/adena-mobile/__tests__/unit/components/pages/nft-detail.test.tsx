import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { NftDetailPage, NftDetailPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<NftDetailPageProps> = {}): NftDetailPageProps => ({
  name: 'Punk #1',
  collectionName: 'GnoPunks',
  imageUri: 'https://example.com/1.png',
  imageLoading: false,
  description: 'A rare punk.',
  rows: [{ label: 'Token ID', value: '1' }, { label: 'Standard', value: 'GRC721' }],
  traits: [{ label: 'Hat', value: 'Cap' }, { label: 'Eyes', value: 'Laser' }],
  collectionDescription: 'gno.land/r/demo/punks',
  onOpenCollection: jest.fn(),
  onSend: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('NftDetailPage', () => {
  it('renders the details and reports actions', async () => {
    const page = props();

    await renderPage(<NftDetailPage {...page} />);

    expect(screen.getByText('A rare punk.')).toBeTruthy();
    expect(screen.getByText('GRC721')).toBeTruthy();
    expect(screen.getByText('Traits')).toBeTruthy();
    expect(screen.getByText('Laser')).toBeTruthy();
    expect(screen.getByText('NFT details')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'GnoPunks, gno.land/r/demo/punks' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onOpenCollection).toHaveBeenCalledTimes(1);
    expect(page.onSend).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('renders duplicate traits without key collisions', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await renderPage(<NftDetailPage {...props({ traits: [{ label: 'Hat', value: 'Cap' }, { label: 'Hat', value: 'Cap' }] })} />);

    expect(screen.getAllByText('Cap')).toHaveLength(2);
    expect(errors.mock.calls.some(args => String(args[0]).includes('same key'))).toBe(false);
    errors.mockRestore();
  });

  it('omits description, traits and send when absent', async () => {
    await renderPage(<NftDetailPage {...props({ description: undefined, traits: [], rows: [], onSend: undefined, onOpenCollection: undefined, imageUri: null, imageLoading: true })} />);

    expect(screen.getByText('Punk #1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /GnoPunks/ })).toBeNull();
    expect(screen.queryByText('Traits')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
  });
});
