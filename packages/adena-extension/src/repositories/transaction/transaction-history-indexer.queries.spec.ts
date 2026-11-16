import { Grc20TokenPackage } from '@common/utils/grc20reg-config';
import {
  makeGRC20ReceivedTransactionHistoryQuery,
  makeGRC20TransactionHistoryQuery,
} from './transaction-history-indexer.queries';

const V0: Grc20TokenPackage = {
  path: 'gno.land/p/nt/grc20/v0',
  transferEvent: {
    type: 'Transfer',
    tokenAttr: 'token',
    fromAttr: 'from',
    toAttr: 'to',
    valueAttr: 'value',
  },
};

const V1: Grc20TokenPackage = {
  path: 'gno.land/p/nt/grc20/v1',
  transferEvent: {
    type: 'Transferred',
    tokenAttr: 'id',
    fromAttr: 'sender',
    toAttr: 'recipient',
    valueAttr: 'amount',
  },
};

describe('makeGRC20ReceivedTransactionHistoryQuery', () => {
  it('matches the recipient attribute of each grc20 version', () => {
    const query = makeGRC20ReceivedTransactionHistoryQuery('g1abc', [V0, V1]);
    expect(query).toContain('pkg_path: { eq: "gno.land/p/nt/grc20/v0" }');
    expect(query).toContain('key: { eq: "to" }');
    expect(query).toContain('pkg_path: { eq: "gno.land/p/nt/grc20/v1" }');
    expect(query).toContain('type: { eq: "Transferred" }');
    expect(query).toContain('key: { eq: "recipient" }');
  });
});

describe('makeGRC20TransactionHistoryQuery', () => {
  it('matches the token and party attributes of each grc20 version', () => {
    const query = makeGRC20TransactionHistoryQuery('g1abc', 'gno.land/r/x/foo.FOO', [V0, V1]);
    expect(query).toContain('key: { eq: "token" }');
    expect(query).toContain('key: { eq: "id" }');
    expect(query).toContain('value: { like: "gno.land/r/x/foo.FOO." }');
    expect(query).toContain('key: { eq: "sender" }');
    expect(query).toContain('key: { eq: "recipient" }');
    expect(query).toContain('key: { eq: "from" }');
    expect(query).toContain('key: { eq: "to" }');
  });
});
