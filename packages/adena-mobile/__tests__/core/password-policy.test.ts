import {isStrongEnoughPassword} from '../../src/core/password-policy';

describe('isStrongEnoughPassword', () => {
  const dev = (global as any).__DEV__;
  afterEach(() => {
    (global as any).__DEV__ = dev;
  });

  it('accepts any non-empty password in debug builds', () => {
    (global as any).__DEV__ = true;
    expect(isStrongEnoughPassword('1')).toBe(true);
    expect(isStrongEnoughPassword('')).toBe(false);
  });

  it('enforces the extension complexity rule in release builds', () => {
    (global as any).__DEV__ = false;
    expect(isStrongEnoughPassword('1234')).toBe(false);
    expect(isStrongEnoughPassword('Correct-Horse-Battery-9!')).toBe(true);
  });
});
