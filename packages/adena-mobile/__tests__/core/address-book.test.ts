import {
  ATOMONE_CHAIN,
  GNO_CHAIN,
} from '@common/utils/chain-utils';
import {Account, createChainRegistry, toBech32} from 'adena-module';

import {
  AddressBookItem,
  chainOfAddress,
  recipientCandidates,
  sanitizeAddressInput,
  validateAddressBookEntry,
} from '../../src/core/address-book';

const registry = createChainRegistry({
  chains: [GNO_CHAIN, ATOMONE_CHAIN],
  gnoNetworkProfiles: [],
  atomoneNetworkProfiles: [],
});
const bytes = (fill: number) => new Uint8Array(20).fill(fill);
const gno = (fill: number) => toBech32('g', bytes(fill));

const item = (over: Partial<AddressBookItem>): AddressBookItem => ({
  id: 'a',
  name: 'Alice',
  address: gno(1),
  createdAt: '0',
  ...over,
});

/** Just what the address-book code reads from an account. */
const account = (id: string, address: string, extra = {}): Account =>
  ({
    id,
    name: id,
    getAddress: async () => address,
    ...extra,
  } as unknown as Account);

describe('chainOfAddress', () => {
  it('finds the chain by its exact prefix', () => {
    expect(chainOfAddress(gno(1), registry)?.chainGroup).toBe('gno');
    expect(
      chainOfAddress(toBech32('atone', bytes(1)), registry)?.chainGroup,
    ).toBe('atomone');
  });

  it('rejects other prefixes and malformed input', () => {
    expect(chainOfAddress(toBech32('cosmos', bytes(1)), registry)).toBeNull();
    expect(chainOfAddress('g1notanaddress', registry)).toBeNull();
  });
});

it('keeps letters and digits only, in lower case', () => {
  expect(sanitizeAddressInput(' G1AB-c d\n')).toBe('g1abcd');
});

describe('validateAddressBookEntry', () => {
  const all = [item({})];

  it('accepts a new address and name', async () => {
    expect(
      await validateAddressBookEntry(
        item({id: '', name: 'Bob', address: gno(2)}),
        all,
        [],
        registry,
        true,
      ),
    ).toBeNull();
  });

  it('rejects an address on a chain the wallet does not know', async () => {
    expect(
      await validateAddressBookEntry(
        item({id: '', name: 'Bob', address: toBech32('cosmos', bytes(2))}),
        all,
        [],
        registry,
        true,
      ),
    ).toEqual({field: 'address', message: 'Invalid address'});
  });

  it('rejects a saved address, an own account and a taken name', async () => {
    expect(
      await validateAddressBookEntry(
        item({id: '', name: 'Bob'}),
        all,
        [],
        registry,
        true,
      ),
    ).toEqual({field: 'address', message: 'Address already registered'});
    expect(
      await validateAddressBookEntry(
        item({id: '', name: 'Bob', address: gno(3)}),
        all,
        [account('me', gno(3))],
        registry,
        true,
      ),
    ).toEqual({field: 'address', message: 'Address already registered'});
    expect(
      await validateAddressBookEntry(
        item({id: '', address: gno(2)}),
        all,
        [],
        registry,
        true,
      ),
    ).toEqual({field: 'name', message: 'Name already in use'});
  });

  it('lets an entry keep its own name and address on edit', async () => {
    expect(
      await validateAddressBookEntry(item({}), all, [], registry, false),
    ).toBeNull();
  });
});

describe('recipientCandidates', () => {
  it('lists other accounts, then saved addresses on the same chain', async () => {
    const book = [
      item({id: 'b1', name: 'Bob', address: gno(2)}),
      item({id: 'b2', name: 'Atom', address: toBech32('atone', bytes(2))}),
      item({id: 'b3', name: 'Self', address: gno(9)}),
    ];
    const accounts = [
      account('current', gno(9)),
      account('second', gno(5)),
      // Session accounts sign for the master account and hold nothing.
      account('session', gno(6), {type: 'SESSION', masterAccountId: 'x'}),
    ];
    const list = await recipientCandidates(book, accounts, 'g', gno(9));
    expect(list.map(c => [c.id, c.own])).toEqual([
      ['second', true],
      ['b1', false],
    ]);
  });
});
