export enum VMQueryType {
  QUERY_DOCUMENT = 'vm/qdoc',
  QUERY_VALUE = 'vm/qval',
}

export interface ABCIAccount {
  BaseAccount: {
    address: string;
    coins: string;
    public_key: {
      '@type': string;
      value: string;
    } | null;
    account_number: string;
    sequence: string;
  };
}

export interface AccountInfo {
  address: string;
  coins: string;
  chainId: string;
  status: 'ACTIVE' | 'IN_ACTIVE';
  publicKey: {
    '@type': string;
    value: string;
  } | null;
  accountNumber: string;
  sequence: string;
}

// Amino JSON wrapper returned by ABCI:
//   auth/accounts/{master}/sessions          → GnoSessionAccountResponse[]
//   auth/accounts/{master}/session/{addr}    → GnoSessionAccountResponse
//
// Proto source: gno tm2/pkg/std/std.proto (BaseSessionAccount) + gno.land
// GnoSessionAccount wrapper (which adds allow_paths).
// The nested BaseAccount fields are what gnokey uses for sign bytes (see
// tm2/pkg/crypto/keys/client/maketx.go).
export interface GnoSessionAccountResponse {
  BaseSessionAccount: {
    BaseAccount: {
      address: string;
      coins: string;
      public_key: {
        '@type': string;
        value: string;
      } | null;
      account_number: string;
      sequence: string;
    };
    master_address: string;
    expires_at: string;
    spend_limit?: string;
    spend_period?: string;
    spend_used?: string;
    spend_reset?: string;
  };
  allow_paths?: string[];
}

// Flat, camelCase representation for consumer convenience. Produced by
// flattenSessionAccount() in utils.ts. The nested response shape stays in
// place so callers that need amino-faithful structure (e.g. for signing
// pipelines) can still use GnoSessionAccountResponse directly.
export interface FlatSessionAccount {
  address: string;
  masterAddress: string;
  publicKey: {
    '@type': string;
    value: string;
  } | null;
  coins: string;
  accountNumber: string;
  sequence: string;
  expiresAt: string;
  spendLimit: string;
  spendPeriod: string;
  spendUsed: string;
  spendReset: string;
  allowPaths: string[];
}

export interface GnoDocumentInfo {
  package_path: string;
  package_line: string;
  package_doc: string;
  values: GnoPackageValue[];
  funcs: GnoFunction[];
}

export interface GnoPackageValue {
  signature: string;
  const: boolean;
  values: GnoDocumentValue[];
  doc: string;
}

export interface GnoDocumentValue {
  name: string;
  doc: string;
  type: string;
}

export interface GnoFunction {
  type: string;
  name: string;
  signature: string;
  doc: string;
  params: GnoFunctionParam[];
  results: GnoFunctionParam[];
}

export interface GnoFunctionParam {
  name: string;
  type: string;
}

export enum StorageDepositEventType {
  StorageDeposit = '/tm.StorageDepositEvent',
  UnlockDeposit = '/tm.StorageUnlockEvent',
}

export enum StorageDepositAttributeKey {
  Deposit = 'Deposit',
  Storage = 'Storage',
  ReleaseStorage = 'ReleaseStorage',
}
