import { isAppError } from '../../../src/core/errors';
import { StorageAddressBookRepository } from '../../../src/repositories/address-book.repository';
import { AddressBookService } from '../../../src/services/address-book.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { catchError, COSMOS_NETWORK, createFakeRegistry, GNO_NETWORK } from '../../helpers/service-fakes';

const G1 = 'g1aaaa';
const G2 = 'g1bbbb';
const ATONE = 'atone1cccc';

const setup = () => {
  const { registry, modules } = createFakeRegistry();

  return { service: new AddressBookService(new StorageAddressBookRepository(new MemoryKeyValueStore()), registry), modules };
};

const errorCode = async (run: () => unknown) => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

describe('AddressBookService', () => {
  it('adds trimmed entries and lists them by name', () => {
    const { service } = setup();
    const zed = service.add({ name: '  Zed ', address: ` ${G1} ` }, GNO_NETWORK);

    service.add({ name: 'alice', address: G2 }, GNO_NETWORK);
    expect(zed).toMatchObject({ name: 'Zed', address: G1, id: expect.any(String), createdAt: expect.any(Number) });
    expect(service.getEntries().map(entry => entry.name)).toEqual(['alice', 'Zed']);
  });

  it('filters entries by the address format of a network', () => {
    const { service } = setup();

    service.add({ name: 'gno', address: G1 }, GNO_NETWORK);
    service.add({ name: 'atone', address: ATONE }, COSMOS_NETWORK);
    expect(service.getEntriesFor(GNO_NETWORK).map(entry => entry.name)).toEqual(['gno']);
    expect(service.getEntriesFor(COSMOS_NETWORK).map(entry => entry.name)).toEqual(['atone']);
  });

  it('stores the canonical address and matches case-insensitively', () => {
    const { service, modules } = setup();

    modules.gno.chain.normalizeAddress.mockImplementation((address: string) => address.toLowerCase());
    const entry = service.add({ name: 'gno', address: 'G1AAAA' }, GNO_NETWORK);

    expect(entry.address).toBe(G1);
    expect(service.findByAddress('G1AAAA')).toEqual(entry);
    expect(() => service.add({ name: 'again', address: G1 }, GNO_NETWORK)).toThrow('This address is already saved');
  });

  it('finds entries by exact address', () => {
    const { service } = setup();
    const entry = service.add({ name: 'gno', address: G1 }, GNO_NETWORK);

    expect(service.findByAddress(G1)).toEqual(entry);
    expect(service.findByAddress(G2)).toBeUndefined();
  });

  it.each([
    ['an empty name', '   '],
    ['a name over 32 characters', 'x'.repeat(33)],
  ])('rejects %s', async (_, name) => {
    const { service } = setup();

    expect(await errorCode(() => service.add({ name, address: G1 }, GNO_NETWORK))).toBe('INVALID_REQUEST');
  });

  it('accepts a 32 character name', () => {
    const { service } = setup();

    expect(service.add({ name: 'x'.repeat(32), address: G1 }, GNO_NETWORK).name).toHaveLength(32);
  });

  it('rejects addresses invalid on the network', async () => {
    const { service } = setup();

    expect(await errorCode(() => service.add({ name: 'a', address: ATONE }, GNO_NETWORK))).toBe('INVALID_ADDRESS');
    expect(service.getEntries()).toEqual([]);
  });

  it('rejects duplicate addresses and case-insensitive duplicate names', async () => {
    const { service } = setup();

    service.add({ name: 'Friend', address: G1 }, GNO_NETWORK);
    await expect(catchError(() => service.add({ name: 'Other', address: G1 }, GNO_NETWORK))).resolves.toThrow('This address is already saved');
    await expect(catchError(() => service.add({ name: 'FRIEND', address: G2 }, GNO_NETWORK))).resolves.toThrow('This name is already used');
    expect(service.getEntries()).toHaveLength(1);
  });

  describe('update', () => {
    it('updates an entry and allows keeping its own name and address', () => {
      const { service } = setup();
      const entry = service.add({ name: 'Friend', address: G1 }, GNO_NETWORK);

      expect(service.update(entry.id, { name: 'friend', address: G1 }, GNO_NETWORK)).toEqual({ ...entry, name: 'friend' });
      expect(service.update(entry.id, { name: 'Friend', address: G2 }, GNO_NETWORK).address).toBe(G2);
      expect(service.findByAddress(G2)?.createdAt).toBe(entry.createdAt);
    });

    it('rejects conflicts with other entries', async () => {
      const { service } = setup();
      const first = service.add({ name: 'First', address: G1 }, GNO_NETWORK);

      service.add({ name: 'Second', address: G2 }, GNO_NETWORK);
      expect(await errorCode(() => service.update(first.id, { name: 'First', address: G2 }, GNO_NETWORK))).toBe('INVALID_REQUEST');
      expect(await errorCode(() => service.update(first.id, { name: 'second', address: G1 }, GNO_NETWORK))).toBe('INVALID_REQUEST');
    });

    it('rejects an unknown id without changing the book', async () => {
      const { service } = setup();
      const entry = service.add({ name: 'First', address: G1 }, GNO_NETWORK);

      await expect(catchError(() => service.update('missing', { name: 'New', address: G2 }, GNO_NETWORK))).resolves.toThrow('Address not found');
      expect(service.getEntries()).toEqual([entry]);
    });
  });

  it('removes entries and ignores unknown ids', () => {
    const { service } = setup();
    const entry = service.add({ name: 'First', address: G1 }, GNO_NETWORK);

    service.remove('missing');
    expect(service.getEntries()).toHaveLength(1);
    service.remove(entry.id);
    expect(service.getEntries()).toEqual([]);
  });
});
