import { isSessionInCreationGrace, shouldMarkSessionRevoked } from './session-chain-visibility';

describe('session-chain-visibility', () => {
  it('treats missing metadata as creation grace', () => {
    expect(isSessionInCreationGrace(null, 100_000)).toBe(true);
  });

  it('keeps recently created sessions in creation grace', () => {
    expect(isSessionInCreationGrace({ createdAt: 90 }, 100_000)).toBe(true);
  });

  it('marks revoked only after grace and a failed recheck', async () => {
    jest.useFakeTimers();
    const result = shouldMarkSessionRevoked({ createdAt: 1 }, async () => false);

    jest.advanceTimersByTime(1_500);
    await expect(result).resolves.toBe(true);
    jest.useRealTimers();
  });

  it('does not mark revoked after grace if the recheck finds the session', async () => {
    jest.useFakeTimers();
    const result = shouldMarkSessionRevoked({ createdAt: 1 }, async () => true);

    jest.advanceTimersByTime(1_500);
    await expect(result).resolves.toBe(false);
    jest.useRealTimers();
  });

  it('never marks revoked while still in creation grace', async () => {
    const recheck = jest.fn();
    await expect(shouldMarkSessionRevoked(null, recheck)).resolves.toBe(false);
    expect(recheck).not.toHaveBeenCalled();
  });
});
