// 'g1' + 38 bech32 chars. Format check only, no checksum (assumed format).
const ADDRESS_PATTERN = /^g1[023456789acdefghjklmnpqrstuvwxyz]{38}$/;

export const isValidAddress = (address: string) => ADDRESS_PATTERN.test(address);
