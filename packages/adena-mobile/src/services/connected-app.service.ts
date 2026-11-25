import { ConnectedApp, DappMetadata } from '../domain/dapp';
import { ConnectedAppRepository } from '../repositories/connected-app.repository';

// A connection belongs to the callback origin plus, on Android, the package that launched it.
const sameCaller = (app: ConnectedApp, callerPackage?: string): boolean => (app.callerPackage ?? null) === (callerPackage ?? null);

export class ConnectedAppService {
  constructor(private readonly connectedAppRepository: ConnectedAppRepository) {}

  getConnectedApps(): ConnectedApp[] {
    return [...this.connectedAppRepository.getAll()].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  find(origin: string, accountId: string, networkId: string, callerPackage?: string): ConnectedApp | undefined {
    return this.connectedAppRepository
      .getAll()
      .find(app => app.origin === origin && sameCaller(app, callerPackage) && app.accountId === accountId && app.networkId === networkId);
  }

  // Extension parity: a site connected for the account on any network may send transactions.
  isConnected(origin: string, accountId: string, callerPackage?: string): boolean {
    return this.connectedAppRepository.getAll().some(app => app.origin === origin && sameCaller(app, callerPackage) && app.accountId === accountId);
  }

  // Connect time: the only place the request's self-declared name and icon are stored.
  touch(origin: string, dapp: DappMetadata, accountId: string, networkId: string, callerPackage?: string): ConnectedApp {
    const existing = this.find(origin, accountId, networkId, callerPackage);

    return this.save(existing, { origin, callerPackage, name: dapp.name, icon: dapp.icon, accountId, networkId });
  }

  // Transaction time: refreshes lastUsedAt and keeps the metadata stored at connect time.
  markUsed(origin: string, accountId: string, networkId: string, callerPackage?: string): ConnectedApp | undefined {
    const existing = this.find(origin, accountId, networkId, callerPackage);
    const connected = existing ?? this.connectedAppRepository.getAll()
      .find(app => app.origin === origin && sameCaller(app, callerPackage) && app.accountId === accountId);

    if (!connected) {
      return undefined;
    }

    return this.save(existing, { origin, callerPackage, name: connected.name, icon: connected.icon, accountId, networkId });
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

  private save(existing: ConnectedApp | undefined, fields: Omit<ConnectedApp, 'connectedAt' | 'lastUsedAt'>): ConnectedApp {
    const now = Date.now();
    const app: ConnectedApp = {
      origin: fields.origin,
      ...(fields.callerPackage ? { callerPackage: fields.callerPackage } : {}),
      name: fields.name,
      icon: fields.icon,
      accountId: fields.accountId,
      networkId: fields.networkId,
      connectedAt: existing?.connectedAt ?? now,
      lastUsedAt: now,
    };
    const others = this.connectedAppRepository.getAll().filter(item => item !== existing && !(
      item.origin === app.origin && sameCaller(item, app.callerPackage) && item.accountId === app.accountId && item.networkId === app.networkId));

    this.connectedAppRepository.saveAll([...others, app]);
    return app;
  }
}
