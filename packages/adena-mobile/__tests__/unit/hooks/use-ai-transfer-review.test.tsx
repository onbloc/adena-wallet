import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { Button, Text } from 'react-native';

import { ReviewSheet } from '../../../src/components/molecules';
import { AiTransferDraft } from '../../../src/domain/ai';
import { useAiTransferReview } from '../../../src/hooks/use-ai-transfer-review';
import { useWalletSnapshot } from '../../../src/hooks/use-wallet-snapshot';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { networkById } from '../../helpers/service-fakes';
import { createTestContainer } from '../../helpers/test-container';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const setup = async () => {
  const { env, account, network, address } = await setupWallet(createTestContainer());

  env.gno.state.balances[address] = '10000000ugnot';

  const token = { ...network.nativeToken, name: 'Gno.land', family: network.family, type: 'native' as const, isNative: true, networkId: network.id };
  const draft = await env.container.transactionService.createTransferDraft({ account, network, token, toAddress: RECIPIENT, amount: '1000000' });
  const transfer: AiTransferDraft = { id: 'transfer', account, network, token, amount: '1000000', toAddress: RECIPIENT, draft };
  const settled = jest.fn();

  const Harness = (): ReactElement => {
    const wallet = useWalletSnapshot();
    const review = useAiTransferReview(wallet.account, wallet.network, settled);
    const [failure, setFailure] = React.useState('');

    return (
      <>
        <Button title='Review' onPress={(): void => { void review.open(transfer).catch(error => setFailure(error.message)); }} />
        <Button title='Invalidate' onPress={review.invalidate} />
        <Text>{failure}</Text>
        {review.review && <ReviewSheet visible {...review.review} confirmLabel='Confirm and send' />}
      </>
    );
  };

  return { env, transfer, settled, Harness };
};

describe('AI transfer approval', () => {
  beforeEach(resetStores);

  it('never accesses signing keys until the reviewed transfer is explicitly confirmed', async () => {
    const { env, Harness, settled } = await setup();
    const accessKeys = jest.spyOn(env.container.keyringSession, 'withKeyPair');

    await renderScreen(Harness, { env });
    await fireEvent.press(screen.getByRole('button', { name: 'Review' }));
    const confirm = await screen.findByRole('button', { name: 'Confirm and send' });

    expect(env.gno.state.broadcasts).toEqual([]);
    expect(accessKeys).not.toHaveBeenCalled();

    await fireEvent.press(confirm);
    await waitFor(() => expect(env.gno.state.broadcasts).toHaveLength(1));
    expect(settled).toHaveBeenCalledWith('transfer', true, 'Transaction confirmed.');
  });

  it('does not sign a reviewed draft after the wallet locks', async () => {
    const { env, Harness } = await setup();

    await renderScreen(Harness, { env });
    await fireEvent.press(screen.getByRole('button', { name: 'Review' }));
    await screen.findByRole('button', { name: 'Confirm and send' });
    env.container.keyringSession.close();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm and send' }));

    expect(await screen.findByText('Wallet context changed. Prepare the transfer again.')).toBeTruthy();
    expect(env.gno.state.broadcasts).toEqual([]);
  });

  it('does not sign a mainnet draft after switching to Onyx, even before the screen rerenders', async () => {
    const { env, Harness } = await setup();
    const accessKeys = jest.spyOn(env.container.keyringSession, 'withKeyPair');

    await renderScreen(Harness, { env });
    await fireEvent.press(screen.getByRole('button', { name: 'Review' }));
    await screen.findByRole('button', { name: 'Confirm and send' });
    env.container.networkService.selectNetwork(networkById('onyx-1').id);
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm and send' }));

    expect(await screen.findByText('Wallet context changed. Prepare the transfer again.')).toBeTruthy();
    expect(accessKeys).not.toHaveBeenCalled();
    expect(env.gno.state.broadcasts).toEqual([]);
  });

  it('rechecks the selected network after asynchronous funds validation before signing', async () => {
    const { env, Harness } = await setup();
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const accessKeys = jest.spyOn(env.container.keyringSession, 'withKeyPair');
    const original = env.container.transactionService.assertSufficientFunds.bind(env.container.transactionService);

    jest.spyOn(env.container.transactionService, 'assertSufficientFunds').mockImplementation(async (...args) => {
      started.resolve();
      await release.promise;
      return original(...args);
    });
    await renderScreen(Harness, { env });
    await fireEvent.press(screen.getByRole('button', { name: 'Review' }));
    await screen.findByRole('button', { name: 'Confirm and send' });
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm and send' }));

    await started.promise;
    env.container.networkService.selectNetwork(networkById('onyx-1').id);
    await act(async () => {
      release.resolve();
      await release.promise;
    });

    expect(await screen.findByText('Wallet context changed. Prepare the transfer again.')).toBeTruthy();
    expect(accessKeys).not.toHaveBeenCalled();
    expect(env.gno.state.broadcasts).toEqual([]);
  });

  it('ignores a late simulation after the review was invalidated', async () => {
    const { env, Harness } = await setup();
    let finish!: () => void;
    const original = env.container.transactionService.estimateFee.bind(env.container.transactionService);
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });

    jest.spyOn(env.container.transactionService, 'estimateFee').mockImplementation(async (...args) => {
      await gate;
      return original(...args);
    });
    await renderScreen(Harness, { env });
    await fireEvent.press(screen.getByRole('button', { name: 'Review' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Invalidate' }));
    await act(async () => {
      finish();
      await gate;
    });

    expect(screen.queryByRole('button', { name: 'Confirm and send' })).toBeNull();
    expect(env.gno.state.broadcasts).toEqual([]);
  });
});
