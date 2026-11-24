import { StorageConnectedAppRepository } from '../../../src/repositories/connected-app.repository';
import { ConnectedAppService } from '../../../src/services/connected-app.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

const ORIGIN = 'https://dapp.example.com';
const OTHER = 'https://other.example.com';

describe('ConnectedAppService', () => {
  let now = 1000;
  let service: ConnectedAppService;

  beforeEach(() => {
    now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    service = new ConnectedAppService(new StorageConnectedAppRepository(new MemoryKeyValueStore()));
  });

  afterEach(() => jest.restoreAllMocks());

  it('records a new connection', () => {
    expect(service.touch(ORIGIN, { name: 'Example', icon: 'https://dapp.example.com/icon.png' }, 'a', 'net-1')).toEqual({
      origin: ORIGIN, name: 'Example', icon: 'https://dapp.example.com/icon.png', accountId: 'a', networkId: 'net-1', connectedAt: 1000, lastUsedAt: 1000,
    });
    expect(service.getConnectedApps()).toHaveLength(1);
  });

  it('refreshes an existing connection in place, keeping connectedAt', () => {
    service.touch(ORIGIN, { name: 'Old name' }, 'a', 'net-1');
    now = 5000;
    const updated = service.touch(ORIGIN, { name: 'New name' }, 'a', 'net-1');

    expect(updated).toMatchObject({ name: 'New name', connectedAt: 1000, lastUsedAt: 5000 });
    expect(service.getConnectedApps()).toEqual([updated]);
  });

  it('scopes connections per account and network', () => {
    service.touch(ORIGIN, { name: 'Example' }, 'a', 'net-1');
    service.touch(ORIGIN, { name: 'Example' }, 'a', 'net-2');
    service.touch(ORIGIN, { name: 'Example' }, 'b', 'net-1');

    expect(service.getConnectedApps()).toHaveLength(3);
    expect(service.find(ORIGIN, 'a', 'net-2')).toMatchObject({ accountId: 'a', networkId: 'net-2' });
    expect(service.find(ORIGIN, 'c', 'net-1')).toBeUndefined();
    expect(service.find(OTHER, 'a', 'net-1')).toBeUndefined();
  });

  it('treats a connection on any network as connected for that account only', () => {
    service.touch(ORIGIN, { name: 'Example' }, 'a', 'net-1');

    expect(service.isConnected(ORIGIN, 'a')).toBe(true);
    expect(service.isConnected(ORIGIN, 'b')).toBe(false);
    expect(service.isConnected(OTHER, 'a')).toBe(false);
  });

  it('sorts by most recent use', () => {
    service.touch(ORIGIN, { name: 'First' }, 'a', 'net-1');
    now = 2000;
    service.touch(OTHER, { name: 'Second' }, 'a', 'net-1');
    now = 3000;
    service.touch(ORIGIN, { name: 'First' }, 'a', 'net-1');

    expect(service.getConnectedApps().map(app => app.origin)).toEqual([ORIGIN, OTHER]);
  });

  it('disconnects an origin for every account and network', () => {
    service.touch(ORIGIN, { name: 'Example' }, 'a', 'net-1');
    service.touch(ORIGIN, { name: 'Example' }, 'b', 'net-2');
    service.touch(OTHER, { name: 'Other' }, 'a', 'net-1');
    service.disconnect(ORIGIN);

    expect(service.getConnectedApps().map(app => app.origin)).toEqual([OTHER]);
  });

  it('drops the connections of a removed account', () => {
    service.touch(ORIGIN, { name: 'Example' }, 'a', 'net-1');
    service.touch(ORIGIN, { name: 'Example' }, 'b', 'net-1');
    service.removeAccount('a');

    expect(service.getConnectedApps().map(app => app.accountId)).toEqual(['b']);
    expect(service.isConnected(ORIGIN, 'a')).toBe(false);
  });

  it('clears everything', () => {
    service.touch(ORIGIN, { name: 'Example' }, 'a', 'net-1');
    service.clear();

    expect(service.getConnectedApps()).toEqual([]);
  });
  it('marks a transaction without replacing the metadata stored at connect time', () => {
    service.touch(ORIGIN, { name: 'Example', icon: 'https://dapp.example.com/icon.png' }, 'a', 'net-1');
    now = 5000;

    expect(service.markUsed(ORIGIN, 'a', 'net-1')).toMatchObject({ name: 'Example', icon: 'https://dapp.example.com/icon.png', connectedAt: 1000, lastUsedAt: 5000 });
    expect(service.markUsed(ORIGIN, 'a', 'net-2')).toMatchObject({ name: 'Example', networkId: 'net-2', connectedAt: 5000 });
    expect(service.markUsed(OTHER, 'a', 'net-1')).toBeUndefined();
    expect(service.getConnectedApps()).toHaveLength(2);
  });

  it('keeps connections of different caller packages apart', () => {
    service.touch(ORIGIN, { name: 'Example' }, 'a', 'net-1', 'com.example.app');

    expect(service.isConnected(ORIGIN, 'a', 'com.example.app')).toBe(true);
    expect(service.isConnected(ORIGIN, 'a', 'com.other.app')).toBe(false);
    expect(service.isConnected(ORIGIN, 'a')).toBe(false);
    expect(service.markUsed(ORIGIN, 'a', 'net-1', 'com.other.app')).toBeUndefined();
    service.touch(ORIGIN, { name: 'Example' }, 'a', 'net-1');
    expect(service.getConnectedApps()).toHaveLength(2);
    expect(service.find(ORIGIN, 'a', 'net-1', 'com.example.app')).toMatchObject({ callerPackage: 'com.example.app' });
    expect(service.find(ORIGIN, 'a', 'net-1')?.callerPackage).toBeUndefined();
  });
});
