import { FlatSessionAccount, GnoSessionAccountResponse } from './types';

export const parseProto = <T>(
  data: string | Uint8Array,
  decodeFn: (input: Uint8Array, length?: number) => T,
): T => {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
  const protoData = decodeFn(buffer);

  return protoData;
};

const HTTP_PROTOCOL_PREFIX = 'http://';
const HTTPS_PROTOCOL_PREFIX = 'https://';

export const hasHttpProtocol = (domain: string): boolean => {
  return isHttpProtocol(domain) || isHttpsProtocol(domain);
};

export const isHttpsProtocol = (domain: string): boolean => {
  return domain.startsWith(HTTPS_PROTOCOL_PREFIX);
};

export const isHttpProtocol = (domain: string): boolean => {
  return domain.startsWith(HTTP_PROTOCOL_PREFIX);
};

export const isInterRealmParameter = (name: string, type: string): boolean => {
  return type === 'realm';
};

export const flattenSessionAccount = (
  res: GnoSessionAccountResponse,
): FlatSessionAccount => {
  const base = res.BaseSessionAccount;
  return {
    address: base.BaseAccount.address,
    masterAddress: base.master_address,
    publicKey: base.BaseAccount.public_key,
    coins: base.BaseAccount.coins,
    accountNumber: base.BaseAccount.account_number,
    sequence: base.BaseAccount.sequence,
    expiresAt: base.expires_at,
    spendLimit: base.spend_limit ?? '',
    spendPeriod: base.spend_period ?? '0',
    spendUsed: base.spend_used ?? '',
    spendReset: base.spend_reset ?? '0',
    allowPaths: res.allow_paths ?? [],
  };
};
