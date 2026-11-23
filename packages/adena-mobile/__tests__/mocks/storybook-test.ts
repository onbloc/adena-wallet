// Stories use `fn()` from storybook/test for action logging; under Jest a plain mock is enough.
export const fn = (): jest.Mock => jest.fn();
