import { ChainFamily, Network } from '../domain/network';

// `gno:g1…`, `cosmos://cosmos1…?amount=1` and similar payment URIs; bech32 addresses never contain `:`.
const PAYMENT_URI = /^([a-z][a-z0-9+.-]*):(?:\/\/)?([^?#]*)([?#].*)?$/i;

// Payment URI schemes accepted per chain family, next to a bare address or the network's address prefix.
const FAMILY_SCHEMES: Record<ChainFamily, readonly string[]> = {
  [ChainFamily.GNO]: ['gno', 'gnoland'],
  [ChainFamily.COSMOS]: ['cosmos', 'atomone'],
};

export interface QrPayload {
  address: string;
  // Lowercased URI scheme, absent for a bare address.
  scheme?: string;
  // True when a query or fragment (e.g. `?amount=`) was present; only the address is ever used.
  hasParams: boolean;
}

export const extractQrAddress = (payload: string): QrPayload => {
  const trimmed = payload.trim();
  const match = PAYMENT_URI.exec(trimmed);

  if (!match) {
    return { address: trimmed, hasParams: false };
  }

  return { address: match[2].trim(), scheme: match[1].toLowerCase(), hasParams: (match[3] ?? '').length > 1 };
};

export interface RecipientQr {
  // Canonical address for the network.
  address: string;
  // The QR carried parameters (amount, memo, …) that were not applied.
  ignoredParams: boolean;
}

// Returns the recipient in a scanned QR payload, or null when it is not a valid address for the network.
export const parseRecipientQr = (
  payload: string,
  network: Pick<Network, 'family' | 'addressPrefix'>,
  normalizeAddress: (address: string) => string | null,
): RecipientQr | null => {
  const { address, scheme, hasParams } = extractQrAddress(payload);
  const schemes = [...FAMILY_SCHEMES[network.family], network.addressPrefix.toLowerCase()];

  if (address.length === 0 || (scheme !== undefined && !schemes.includes(scheme))) {
    return null;
  }

  const normalized = normalizeAddress(address);

  return normalized === null ? null : { address: normalized, ignoredParams: hasParams };
};
