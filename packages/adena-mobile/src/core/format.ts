import {GNOT_TOKEN} from '@common/constants/token.constant';
import BigNumber from 'bignumber.js';

/** ugnot → "1,234.56 GNOT" */
export function formatGnot(ugnot: number | string | null | undefined): string {
  if (ugnot === null || ugnot === undefined) {
    return '-';
  }
  const value = BigNumber(ugnot).shiftedBy(-GNOT_TOKEN.decimals);
  return `${value.toFormat()} ${GNOT_TOKEN.symbol}`;
}

/** "1.5" GNOT → "1500000" ugnot, or null when the input is not a positive amount. */
export function parseGnotToUgnot(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const value = BigNumber(trimmed).shiftedBy(GNOT_TOKEN.decimals);
  if (!value.isInteger() || value.lte(0)) {
    return null;
  }
  return value.toFixed(0);
}

/** Splits an address for display: the first and last 6 characters stand out. */
export function addressParts(address: string): {
  head: string;
  middle: string;
  tail: string;
} {
  if (address.length <= 12) {
    return {head: address, middle: '', tail: ''};
  }
  return {
    head: address.slice(0, 6),
    middle: address.slice(6, -6),
    tail: address.slice(-6),
  };
}
