export type QueryType =
  'GET_ACCOUNT_INFO' |
  'GET_BALANCES' |
  'QUERY_RENDER' |
  'QUERY_EVAL' |
  'QUERY_PACKAGE' |
  'QUERY_FILE' |
  'QUERY_FUNCTIONS' |
  'QUERY_STORE'
  ;

export const QUERY_PATH: { [key in QueryType]: string } = {
  GET_ACCOUNT_INFO: 'auth/accounts/:address',
  GET_BALANCES: 'bank/balances/:address',
  QUERY_RENDER: 'vm/qrender',
  QUERY_EVAL: 'vm/qeval',
  QUERY_PACKAGE: 'vm/package',
  QUERY_FILE: 'vm/qfile',
  QUERY_FUNCTIONS: 'vm/qfuncs',
  QUERY_STORE: 'vm/store',
};