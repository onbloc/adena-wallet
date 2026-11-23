// 'g1' + 38 bech32 chars. Format check only, no checksum (assumed format).
const ADDRESS_PATTERN = /^g1[023456789acdefghjklmnpqrstuvwxyz]{38}$/;

export const ADDRESS_LENGTH = 40;

/** Shown to the user (via the model) when an address has the wrong length. */
export const INVALID_ADDRESS_LENGTH_MESSAGE = 'The address length is not valid. Please check it again.';

export const isValidAddress = (address: string) => ADDRESS_PATTERN.test(address);
