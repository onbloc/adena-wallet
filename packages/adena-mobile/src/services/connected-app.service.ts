import { ConnectedApp, DappMetadata } from '../domain/dapp';
import { ConnectedAppRepository } from '../repositories/connected-app.repository';

export class ConnectedAppService {
  constructor(private readonly connectedAppRepository: ConnectedAppRepository) {}

  getConnectedApps(): ConnectedApp[] {
    return [...this.connectedAppRepository.getAll()].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  find(origin: string, accountId: string, networkId: string): ConnectedApp | undefined {
    return this.connectedAppRepository
      .getAll()
      .find(app => app.origin === origin && app.accountId === accountId && app.networkId === networkId);
  }

  // Extension parity: a site connected for the account on any network may send transactions.
  isConnected(origin: string, accountId: string): boolean {
    return this.connectedAppRepository.getAll().some(app => app.origin === origin && app.accountId === accountId);
  }

  touch(origin: string, dapp: DappMetadata, accountId: string, networkId: string): ConnectedApp {
    const now = Date.now();
    const existing = this.find(origin, accountId, networkId);
    const app: ConnectedApp = {
      origin,
      name: dapp.name,
      icon: dapp.icon,
      accountId,
      networkId,
      connectedAt: existing?.connectedAt ?? now,
      lastUsedAt: now,
    };
    const others = this.connectedAppRepository.getAll().filter(item => item !== existing && !(
      item.origin === origin && item.accountId === accountId && item.networkId === networkId));

    this.connectedAppRepository.saveAll([...others, app]);
    return app;
  }

  disconnect(origin: string): void {
    this.connectedAppRepository.saveAll(this.connectedAppRepository.getAll().filter(app => app.origin !== origin));
  }

  removeAccount(accountId: string): void {
    this.connectedAppRepository.saveAll(this.connectedAppRepository.getAll().filter(app => app.accountId !== accountId));
  }

  clear(): void {
    this.connectedAppRepository.clear();
  }
}
