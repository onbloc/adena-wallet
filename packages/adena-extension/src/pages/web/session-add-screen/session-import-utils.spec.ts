import {
  sanitizeMasterAddressInput,
  sanitizeSessionPrivateKeyInput,
} from './session-import-utils';

describe('session import input utils', () => {
  it('keeps only letters and numbers in master address input and limits it to 40 chars', () => {
    expect(sanitizeMasterAddressInput('g1abc-한글_1234567890123456789012345678901234567890')).toBe(
      'g1abc12345678901234567890123456789012345',
    );
  });

  it('keeps only letters and numbers in session private key input', () => {
    expect(sanitizeSessionPrivateKeyInput('0xABcd12-34_!@#zz')).toBe('0xABcd1234zz');
  });
});
