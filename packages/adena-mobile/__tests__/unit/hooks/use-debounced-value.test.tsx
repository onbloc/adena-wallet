import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '../../../src/hooks/use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('applies the last value after the delay and clears immediately', async () => {
    const { result, rerender } = await renderHook(({ value }: { value: string }) => useDebouncedValue(value, 200), { initialProps: { value: 'a' } });

    await rerender({ value: 'ab' });
    await rerender({ value: 'abc' });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('abc');

    await rerender({ value: '' });
    expect(result.current).toBe('');
  });
});
