import { deriveHistoryStatus } from './derive-history-status';
import type { TransactionHistoryStatus } from './types';

describe('deriveHistoryStatus', () => {
  it('keeps success after a fetch error when fetch data is retained', () => {
    expect(deriveHistoryStatus(true, true, 'error', 'success', true)).toBe('success');
  });

  it('reports a fetch error when there is no fetch data', () => {
    expect(deriveHistoryStatus(true, true, 'error', 'success', false)).toBe('error');
  });

  it('reports fetch failure even when post-processing is still waiting for data', () => {
    expect(deriveHistoryStatus(true, true, 'error', 'loading', false)).toBe('error');
  });

  it.each<[
    boolean,
    boolean,
    'pending' | 'error' | 'success',
    'loading' | 'error' | 'success',
    TransactionHistoryStatus,
  ]>([
    [false, true, 'error', 'loading', 'unsupported'],
    [true, false, 'error', 'loading', 'unsupported'],
    [true, true, 'error', 'success', 'error'],
    [true, true, 'error', 'error', 'error'],
    [true, true, 'pending', 'loading', 'loading'],
    [true, true, 'pending', 'success', 'loading'],
    [true, true, 'pending', 'error', 'loading'],
    [true, true, 'success', 'loading', 'loading'],
    [true, true, 'success', 'error', 'error'],
    [true, true, 'success', 'success', 'success'],
  ])('supported=%s enabled=%s fetch=%s processing=%s returns %s', (
    supported, enabled, fetchStatus, processingStatus, expected,
  ) => {
    expect(deriveHistoryStatus(supported, enabled, fetchStatus, processingStatus, false)).toBe(expected);
  });

  it('keeps success for queries refetching with previous data', () => {
    const fetchQuery = { status: 'success', isFetching: true } as const;
    const processingQuery = { status: 'success', isFetching: true } as const;

    expect(deriveHistoryStatus(true, true, fetchQuery.status, processingQuery.status, true)).toBe('success');
  });
});
