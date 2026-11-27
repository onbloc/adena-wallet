import { isValidGnoAddress } from '../../harness/mcp';

export const ADDRESS_LENGTH = 40;

/** Shown to the user (via the model) when an address has the wrong length. */
export const INVALID_ADDRESS_LENGTH_MESSAGE = 'The address length is not valid. Please check it again.';

export const normalizeAddress = (address: string) => address.toLowerCase();

export const isValidAddress = (address: string) => isValidGnoAddress(normalizeAddress(address));
