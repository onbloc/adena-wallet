import { DappMethod, DappResponseStatus } from '../../../src/domain/dapp';

describe('dapp enums', () => {
  it('exposes the wire values', () => {
    expect(Object.values(DappMethod)).toEqual(['connect', 'sign-transaction', 'sign-and-broadcast']);
    expect(Object.values(DappResponseStatus)).toEqual(['success', 'failure']);
  });
});
