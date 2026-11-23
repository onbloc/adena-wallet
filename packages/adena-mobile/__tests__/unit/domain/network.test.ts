import { ChainFamily } from '../../../src/domain/network';

describe('ChainFamily', () => {
  it('exposes the supported families', () => {
    expect(ChainFamily).toEqual({ GNO: 'gno', COSMOS: 'cosmos' });
  });
});
