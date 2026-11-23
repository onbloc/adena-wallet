import { SecretImportMode } from '../../../src/domain/account';

describe('SecretImportMode', () => {
  it('exposes the import modes', () => {
    expect(SecretImportMode).toEqual({ MNEMONIC: 'mnemonic', PRIVATE_KEY: 'privateKey' });
  });
});
