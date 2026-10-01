import { Wallet } from 'adena-module';
import { WalletRepository } from '@repositories/wallet';
import { WalletService } from './wallet';

type MockRepository = WalletRepository & { [key: string]: jest.Mock };

function makeRepo({ serialized = '', unlocked = true } = {}): MockRepository {
  return {
    getSerializedWallet: jest.fn(async () => {
      if (!serialized) {
        throw new Error('NOT_FOUND_SERIALIZED');
      }
      return serialized;
    }),
    // The session password is shared by every document, so this is what decides
    // whether a cached wallet may still be reused.
    existsWalletPassword: jest.fn(async () => unlocked),
    getWalletPassword: jest.fn(async () => 'password'),
    getKdfSalt: jest.fn(async () => null),
    deleteWalletPassword: jest.fn(async () => true),
  } as unknown as MockRepository;
}

function makeWallet(): Wallet {
  return { accounts: [], keyrings: [] } as unknown as Wallet;
}

describe('WalletService current wallet reuse', () => {
  it('hands out the registered wallet without reading storage', async () => {
    const repo = makeRepo();
    const service = new WalletService(repo);
    const wallet = makeWallet();
    service.setCurrentWalletResolver(() => wallet);

    await expect(service.getCurrentWallet()).resolves.toBe(wallet);
    expect(repo.existsWalletPassword).toHaveBeenCalled();
    expect(repo.getSerializedWallet).not.toHaveBeenCalled();
    expect(repo.getWalletPassword).not.toHaveBeenCalled();
  });

  it('falls back to storage when no wallet is registered', async () => {
    const repo = makeRepo();
    const service = new WalletService(repo);

    await expect(service.getCurrentWallet()).rejects.toThrow();
    expect(repo.getSerializedWallet).toHaveBeenCalled();
  });

  it('falls back to storage when the registered wallet is gone', async () => {
    const repo = makeRepo();
    const service = new WalletService(repo);
    service.setCurrentWalletResolver(() => null);

    await expect(service.getCurrentWallet()).rejects.toThrow();
    expect(repo.getSerializedWallet).toHaveBeenCalled();
  });

  it('does not reuse the wallet when another document has locked it', async () => {
    // Locking in one popup/web document clears only that document's resolver.
    // This one still holds its wallet, so reuse has to be denied by the shared
    // lock state rather than by the local resolver.
    const repo = makeRepo({ unlocked: false });
    const service = new WalletService(repo);
    const wallet = makeWallet();
    service.setCurrentWalletResolver(() => wallet);

    await expect(service.getCurrentWallet()).rejects.toThrow();
    expect(repo.existsWalletPassword).toHaveBeenCalled();
    expect(repo.getSerializedWallet).toHaveBeenCalled();
  });

  it('stops reusing the wallet once locked, and locks without deserializing', async () => {
    const repo = makeRepo();
    const service = new WalletService(repo);
    service.setCurrentWalletResolver(() => makeWallet());

    await service.lockWallet();

    expect(repo.deleteWalletPassword).toHaveBeenCalledTimes(1);
    // The old implementation deserialized the wallet here only to destroy a
    // throwaway copy, which cost a full Argon2id derivation.
    expect(repo.getWalletPassword).not.toHaveBeenCalled();
    await expect(service.getCurrentWallet()).rejects.toThrow();
  });
});
