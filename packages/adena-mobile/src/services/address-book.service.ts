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

  // Only entries whose address is valid on the given network (e.g. g1… vs atone1…).
  getEntriesFor(network: Network): AddressBookEntry[] {
    const chain = this.chainRegistry.forNetwork(network);

    return this.getEntries().filter(entry => chain.isValidAddress(entry.address, network));
  }

  findByAddress(address: string): AddressBookEntry | undefined {
    return this.repository.getAll().find(entry => entry.address === address);
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
    const address = input.address.trim();

    if (!name || name.length > 32) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Enter a name up to 32 characters');
    }

    if (!this.chainRegistry.forNetwork(network).isValidAddress(address, network)) {
      throw new AppError(AppErrorCode.INVALID_ADDRESS, `Enter a valid ${network.chainName} address`);
    }

    const others = this.repository.getAll().filter(entry => entry.id !== ignoreId);

    if (others.some(entry => entry.address === address)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This address is already saved');
    }

    if (others.some(entry => entry.name.toLowerCase() === name.toLowerCase())) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This name is already used');
    }

    return { name, address };
  }
}
