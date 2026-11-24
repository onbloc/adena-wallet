import { AppError, AppErrorCode } from '../core/errors';
import { AddressBookEntry } from '../domain/address-book';
import { Network } from '../domain/network';
import { AddressBookRepository } from '../repositories/address-book.repository';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { createId } from '../utils/id';

export interface AddressBookInput {
  name: string;
  address: string;
}

export class AddressBookService {
  constructor(private readonly repository: AddressBookRepository, private readonly chainRegistry: ChainRegistry) {}

  getEntries(): AddressBookEntry[] {
    return [...this.repository.getAll()].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Only entries whose address is valid on the given network (e.g. g1… vs atone1…), in canonical form.
  getEntriesFor(network: Network): AddressBookEntry[] {
    const chain = this.chainRegistry.forNetwork(network);

    return this.getEntries().flatMap((entry) => {
      const address = chain.normalizeAddress(entry.address, network);

      return address === null ? [] : [{ ...entry, address }];
    });
  }

  // bech32 is case-insensitive, so `G1…` and `g1…` are the same entry.
  findByAddress(address: string): AddressBookEntry | undefined {
    const wanted = address.trim().toLowerCase();

    return this.repository.getAll().find(entry => entry.address.toLowerCase() === wanted);
  }

  add(input: AddressBookInput, network: Network): AddressBookEntry {
    const entry: AddressBookEntry = { id: createId(), createdAt: Date.now(), ...this.validate(input, network) };

    this.repository.saveAll([...this.repository.getAll(), entry]);
    return entry;
  }

  update(id: string, input: AddressBookInput, network: Network): AddressBookEntry {
    const valid = this.validate(input, network, id);
    const entries = this.repository.getAll().map(entry => (entry.id === id ? { ...entry, ...valid } : entry));

    this.repository.saveAll(entries);
    const updated = entries.find(entry => entry.id === id);

    if (!updated) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Address not found');
    }

    return updated;
  }

  remove(id: string): void {
    this.repository.saveAll(this.repository.getAll().filter(entry => entry.id !== id));
  }

  private validate(input: AddressBookInput, network: Network, ignoreId?: string): AddressBookInput {
    const name = input.name.trim();
    const address = this.chainRegistry.forNetwork(network).normalizeAddress(input.address.trim(), network);

    if (!name || name.length > 32) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Enter a name up to 32 characters');
    }

    if (address === null) {
      throw new AppError(AppErrorCode.INVALID_ADDRESS, `Enter a valid ${network.chainName} address`);
    }

    const others = this.repository.getAll().filter(entry => entry.id !== ignoreId);

    if (others.some(entry => entry.address.toLowerCase() === address)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This address is already saved');
    }

    if (others.some(entry => entry.name.toLowerCase() === name.toLowerCase())) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This name is already used');
    }

    return { name, address };
  }
}
