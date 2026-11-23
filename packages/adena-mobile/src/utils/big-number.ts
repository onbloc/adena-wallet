import BaseBigNumber from 'bignumber.js';

// bignumber.js v11 throws on invalid input by default (STRICT). The app treats
// user/API input as untrusted and checks `isFinite()` instead, so invalid values become NaN.
export const BigNumber = BaseBigNumber.clone({ STRICT: false });
export type BigNumber = BaseBigNumber;
