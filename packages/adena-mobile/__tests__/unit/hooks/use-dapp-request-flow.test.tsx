import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';

import { AppError, AppErrorCode } from '../../../src/core/errors';
import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { DappMethod, DappRequest } from '../../../src/domain/dapp';
import { DappRequestFlowOptions, useDappRequestFlow } from '../../../src/hooks/use-dapp-request-flow';
import { BUILT_IN_NETWORKS } from '../../../src/resources';

const network = BUILT_IN_NETWORKS[0];
const context = { network, account: { id: 'acc', name: 'Account 1' }, address: 'g1abc', requiresNetworkSwitch: false };
const prepared = { draft: { fee: { gasFee: '1500000ugnot', gasWanted: '1' } }, summaries: [{ title: 'Call', rows: [] }] };

const request = (method: DappRequest['method'], requestId = 'req'): DappRequest => ({ method, requestId } as unknown as DappRequest);

const createDapp = () => ({
  resolveContext: jest.fn(() => context),
  prepareTransaction: jest.fn().mockResolvedValue(prepared),
  approveConnect: jest.fn(() => 'cb://connect'),
  approveTransaction: jest.fn().mockResolvedValue('cb://tx'),
  reject: jest.fn(() => 'cb://reject'),
  fail: jest.fn(() => 'cb://fail'),
});

const setup = async (dapp: ReturnType<typeof createDapp>, req: DappRequest | null, options: DappRequestFlowOptions = { allowCrossNetwork: false }) => {
  const container = { dappService: dapp } as unknown as AppContainer;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <ContainerProvider container={container}><QueryClientProvider client={client}>{children}</QueryClientProvider></ContainerProvider>
  );
  const hook = await renderHook(() => useDappRequestFlow(req, options), { wrapper });

  return { ...hook, client };
};

describe('useDappRequestFlow', () => {
  it('is empty without a request', async () => {
    const dapp = createDapp();
    const { result } = await setup(dapp, null);

    expect(result.current).toMatchObject({ title: '', approveLabel: '', isTransaction: false, canApprove: false, loading: false, messages: [], feeLabel: undefined });
    expect(result.current.rejectionUrl()).toBeNull();
    await act(async () => {
      await expect(result.current.approve()).rejects.toThrow('Request is not ready');
    });
    expect(result.current.error).toBe('Request is not ready');
    expect(dapp.resolveContext).not.toHaveBeenCalled();
  });

  it('approves and rejects a connect request', async () => {
    const dapp = createDapp();
    const { result } = await setup(dapp, request(DappMethod.CONNECT));

    expect(result.current).toMatchObject({ title: 'Connect app', approveLabel: 'Connect', canApprove: true, isTransaction: false });
    expect(dapp.prepareTransaction).not.toHaveBeenCalled();
    await act(async () => {
      await expect(result.current.approve()).resolves.toBe('cb://connect');
    });
    expect(result.current.rejectionUrl()).toBe('cb://reject');
  });

  it('answers a resolution failure with its original error', async () => {
    const dapp = createDapp();
    const cause = new AppError(AppErrorCode.INVALID_REQUEST, 'Not connected');

    dapp.resolveContext.mockImplementation(() => {
      throw cause;
    });
    const { result } = await setup(dapp, request(DappMethod.SIGN_TRANSACTION));

    expect(result.current).toMatchObject({ error: 'Not connected', canApprove: false, title: 'Sign transaction', approveLabel: 'Sign' });
    expect(result.current.rejectionUrl()).toBe('cb://fail');
    expect(dapp.fail).toHaveBeenCalledWith(expect.anything(), cause);
  });

  it('wraps a thrown non-error for the failure response', async () => {
    const dapp = createDapp();

    dapp.resolveContext.mockImplementation(() => {
      throw undefined;
    });
    const { result } = await setup(dapp, request(DappMethod.CONNECT));

    result.current.rejectionUrl();
    expect(dapp.fail).toHaveBeenCalledWith(expect.anything(), new Error('Something went wrong. Try again.'));
  });

  it('requires a network switch unless cross-network signing is allowed', async () => {
    const dapp = createDapp();

    dapp.resolveContext.mockReturnValue({ ...context, requiresNetworkSwitch: true });
    const { result } = await setup(dapp, request(DappMethod.SIGN_AND_BROADCAST));

    expect(result.current).toMatchObject({ needsSwitch: true, canApprove: false, loading: false });
    expect(dapp.prepareTransaction).not.toHaveBeenCalled();

    const cross = await setup(dapp, request(DappMethod.SIGN_AND_BROADCAST, 'cross'), { allowCrossNetwork: true });

    expect(cross.result.current.needsSwitch).toBe(false);
    await waitFor(() => expect(cross.result.current.canApprove).toBe(true));
  });

  it('prepares, authorizes, signs and releases a transaction', async () => {
    const dapp = createDapp();
    const authorize = jest.fn().mockResolvedValue(undefined);
    const release = jest.fn();
    const { result } = await setup(dapp, request(DappMethod.SIGN_AND_BROADCAST), { allowCrossNetwork: false, authorize, release });

    expect(result.current).toMatchObject({ title: 'Confirm transaction', approveLabel: 'Approve', loading: true, canApprove: false });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ canApprove: true, messages: prepared.summaries, feeLabel: `1.5 ${network.feeToken.symbol}` });
    await act(async () => {
      await expect(result.current.approve()).resolves.toBe('cb://tx');
    });
    expect(authorize).toHaveBeenCalled();
    expect(release).toHaveBeenCalled();
    expect(dapp.approveTransaction).toHaveBeenCalledWith(expect.anything(), context, prepared.draft);
  });

  it('releases even when signing fails and resets the approval error', async () => {
    const dapp = createDapp();
    const release = jest.fn();

    dapp.approveTransaction.mockRejectedValue(new Error('broadcast failed'));
    const { result } = await setup(dapp, request(DappMethod.SIGN_TRANSACTION), { allowCrossNetwork: false, release });

    await waitFor(() => expect(result.current.canApprove).toBe(true));
    await act(async () => {
      await expect(result.current.approve()).rejects.toThrow('broadcast failed');
    });
    expect(release).toHaveBeenCalled();
    expect(result.current.error).toBe('broadcast failed');
    await act(async () => result.current.resetApproval());
    await waitFor(() => expect(result.current.error).toBeUndefined());
  });

  it('aborts when authorization throws, without signing', async () => {
    const dapp = createDapp();
    const authorize = jest.fn().mockRejectedValue(new Error('Biometrics cancelled'));
    const release = jest.fn();
    const { result } = await setup(dapp, request(DappMethod.SIGN_TRANSACTION), { allowCrossNetwork: false, authorize, release });

    await waitFor(() => expect(result.current.canApprove).toBe(true));
    await act(async () => {
      await expect(result.current.approve()).rejects.toThrow('Biometrics cancelled');
    });
    expect(dapp.approveTransaction).not.toHaveBeenCalled();
    // authorize may have opened the session before failing, so it is released too.
    expect(release).toHaveBeenCalled();
  });

  it('refuses to sign before the transaction is prepared', async () => {
    const dapp = createDapp();

    dapp.prepareTransaction.mockReturnValue(new Promise(() => undefined));
    const { result } = await setup(dapp, request(DappMethod.SIGN_TRANSACTION));

    await act(async () => {
      await expect(result.current.approve()).rejects.toThrow('Transaction is not ready');
    });
  });

  it('shows preparation errors and hides an unparsable fee', async () => {
    const dapp = createDapp();

    dapp.prepareTransaction.mockRejectedValue(new Error('simulation failed'));
    const { result } = await setup(dapp, request(DappMethod.SIGN_TRANSACTION));

    await waitFor(() => expect(result.current.error).toBe('simulation failed'));
    expect(result.current.canApprove).toBe(false);

    const odd = createDapp();

    odd.prepareTransaction.mockResolvedValue({ ...prepared, draft: { fee: { gasFee: 'n/a' } } });
    const other = await setup(odd, request(DappMethod.SIGN_TRANSACTION, 'odd'));

    await waitFor(() => expect(other.result.current.canApprove).toBe(true));
    expect(other.result.current.feeLabel).toBeUndefined();
  });

  it('never prepares a connect request even if the query is forced', async () => {
    const dapp = createDapp();
    const { client } = await setup(dapp, request(DappMethod.CONNECT));
    const query = client.getQueryCache().findAll()[0];

    await expect(query.fetch()).rejects.toThrow('Nothing to prepare');
  });
});
