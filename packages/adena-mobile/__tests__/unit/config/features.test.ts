import { FEATURES } from '../../../src/config/features';

describe('FEATURES', () => {
  it('keeps atomone hidden by default', () => {
    expect(FEATURES.atomone).toBe(false);
  });
});
