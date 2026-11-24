import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Tabs } from '../../../../src/components/molecules';

describe('Tabs', () => {
  it('selects enabled tabs only', async () => {
    const onSelect = jest.fn();

    await render(
      <Tabs
        items={[{ key: 'tokens', label: 'Tokens' }, { key: 'nfts', label: 'NFTs' }, { key: 'off', label: 'Off', disabled: true }]}
        selected='tokens'
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Tokens');
    await fireEvent.press(screen.getByRole('tab', { name: 'NFTs' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Off' }));
    expect(onSelect.mock.calls).toEqual([['nfts']]);
  });
});
