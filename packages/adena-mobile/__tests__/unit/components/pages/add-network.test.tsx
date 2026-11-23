import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { AddNetworkPage, AddNetworkPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<AddNetworkPageProps> = {}): AddNetworkPageProps => ({
  name: 'My node',
  rpcUrl: 'https://rpc.example.com:443',
  baseNetworkName: 'Gno.land',
  endpointLabel: 'RPC URL',
  onChangeName: jest.fn(),
  onChangeRpcUrl: jest.fn(),
  onSelectBaseNetwork: jest.fn(),
  submitting: false,
  onSubmit: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('AddNetworkPage', () => {
  it('reports edits, base network selection and submission', async () => {
    const page = props();

    await renderPage(<AddNetworkPage {...page} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Chain type: Gno.land' }));
    await fireEvent.changeText(screen.getByLabelText('Network name'), 'Local');
    await fireEvent.changeText(screen.getByLabelText('RPC URL'), 'http://127.0.0.1:26657');
    await fireEvent.press(screen.getByRole('button', { name: 'Add network' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onSelectBaseNetwork).toHaveBeenCalledTimes(1);
    expect(page.onChangeName).toHaveBeenCalledWith('Local');
    expect(page.onChangeRpcUrl).toHaveBeenCalledWith('http://127.0.0.1:26657');
    expect(page.onSubmit).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['blank name', { name: '   ' }],
    ['blank url', { rpcUrl: ' ' }],
    ['submitting', { submitting: true }],
  ])('does not submit with %s', async (_, overrides) => {
    const page = props(overrides);

    await renderPage(<AddNetworkPage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add network' }));
    expect(page.onSubmit).not.toHaveBeenCalled();
  });

  it('shows the endpoint error and the loading label', async () => {
    await renderPage(<AddNetworkPage {...props({ error: 'Could not reach the node', submitting: true })} />);

    expect(screen.getByText('Could not reach the node')).toBeTruthy();
    expect(screen.getByText('Checking node…')).toBeTruthy();
  });
});
