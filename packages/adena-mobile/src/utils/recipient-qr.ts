// `gno:g1…`, `cosmos://cosmos1…?amount=1` and similar payment URIs; bech32 addresses never contain `:`.
const URI_SCHEME = /^[a-z][a-z0-9+.-]*:(?:\/\/)?/i;

export const extractQrAddress = (payload: string): string => {
  const trimmed = payload.trim();
  const match = URI_SCHEME.exec(trimmed);

  if (!match) {
    return trimmed;
  }

  return trimmed.slice(match[0].length).split('?')[0].trim();
};

// Returns the recipient address in a scanned QR payload, or null when it is not valid for the network.
export const parseRecipientQr = (payload: string, isValidAddress: (address: string) => boolean): string | null => {
  const address = extractQrAddress(payload);

  return address.length > 0 && isValidAddress(address) ? address : null;
};
