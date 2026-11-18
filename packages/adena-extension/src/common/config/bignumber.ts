import BigNumber from 'bignumber.js';

// bignumber.js 10+ throws on unparseable input; amount handling across the app
// relies on the earlier NaN result, so keep that behaviour for every bundle.
BigNumber.config({ STRICT: false });
