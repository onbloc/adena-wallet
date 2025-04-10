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
