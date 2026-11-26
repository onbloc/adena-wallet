import { AppError, AppErrorCode } from '../../../src/core/errors';
import { createQueryClient, handleLockedError } from '../../../src/queries/query-client';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';

describe('createQueryClient', () => {
  const options = createQueryClient().getDefaultOptions();
  const retry = options.queries?.retry as (failureCount: number, error: unknown) => boolean;

  it('sets cache timings and disables mutation retries', () => {
    expect(options.queries?.staleTime).toBe(15_000);
    expect(options.queries?.gcTime).toBe(300_000);
    expect(options.mutations?.retry).toBe(false);
  });

  it('retries generic errors twice', () => {
    expect(retry(0, new Error('x'))).toBe(true);
    expect(retry(1, new AppError(AppErrorCode.NETWORK_ERROR))).toBe(true);
    expect(retry(2, new Error('x'))).toBe(false);
  });

  it('never retries invalid requests or a locked wallet', () => {
    expect(retry(0, new AppError(AppErrorCode.INVALID_REQUEST))).toBe(false);
    expect(retry(0, new AppError(AppErrorCode.WALLET_LOCKED))).toBe(false);
  });

  // A keyring closed under an unlocked UI (e.g. after a JS reload) sends the user to the unlock screen.
  it('moves an unlocked session to the unlock screen on a locked error', () => {
    useSessionStore.setState({ status: SessionStatus.UNLOCKED });
    handleLockedError(new Error('other'));
    expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED);

    handleLockedError(new AppError(AppErrorCode.WALLET_LOCKED, 'Wallet is locked'));
    expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED);
  });

  it('wires the handler only into the client that owns the session', () => {
    expect(createQueryClient({ lockOnLockedError: true }).getMutationCache().config.onError).toBe(handleLockedError);
    expect(createQueryClient({ lockOnLockedError: true }).getQueryCache().config.onError).toBe(handleLockedError);
    expect(createQueryClient().getMutationCache().config.onError).toBeUndefined();
  });

  it('returns a new client per call', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
