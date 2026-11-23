import { navigationRef } from '../../../src/navigation/navigation-ref';

describe('navigationRef', () => {
  it('is a container ref that is not ready before mounting', () => {
    expect(navigationRef.isReady()).toBe(false);
    expect(typeof navigationRef.navigate).toBe('function');
  });
});
