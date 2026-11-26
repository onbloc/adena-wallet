import { canFetchNextHistoryPage } from './derive-history-status';
import type { TransactionHistoryStatus } from './types';

describe('canFetchNextHistoryPage', () => {
  it.each<[boolean, TransactionHistoryStatus, boolean, boolean, boolean]>([
    [true, 'unsupported', false, true, false],
    [true, 'error', false, true, false],
    [true, 'loading', false, true, false],
    [true, 'success', true, true, false],
    [true, 'success', false, false, false],
    [false, 'success', false, true, false],
    [true, 'success', false, true, true],
  ])('scroll=%s status=%s fetching=%s hasNextPage=%s returns %s', (
    loadingNextFetch, status, isFetching, hasNextPage, expected,
  ) => {
    expect(canFetchNextHistoryPage(loadingNextFetch, status, isFetching, hasNextPage)).toBe(expected);
  });
});
