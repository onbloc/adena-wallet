import { NotificationPermission } from '../../../src/domain/notification';
import { DeviceRegistration, NotificationRegistrationApi } from '../../../src/infrastructure/http/notification-api.client';
import { StorageNotificationSettingRepository } from '../../../src/repositories/notification-setting.repository';
import { NotificationService, PushMessaging } from '../../../src/services/notification.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const createMessaging = (initial: NotificationPermission = NotificationPermission.NOT_DETERMINED) => {
  let permission = initial;
  let refresh: ((token: string) => void) | undefined;
  const messaging: PushMessaging & { grantOnRequest: NotificationPermission; token: string } = {
    platform: 'android',
    grantOnRequest: NotificationPermission.GRANTED,
    token: 'token-1',
    getPermission: async () => permission,
    requestPermission: async () => {
      permission = messaging.grantOnRequest;
      return permission;
    },
    getToken: async () => messaging.token,
    deleteToken: jest.fn(async () => undefined),
    onTokenRefresh: (listener) => {
      refresh = listener;
      return () => undefined;
    },
    onForegroundMessage: () => () => undefined,
  };

  return { messaging, setPermission: (next: NotificationPermission) => (permission = next), refresh: (token: string) => refresh?.(token) };
};

const createApi = () => {
  const registrations: { id: string; registration: DeviceRegistration }[] = [];
  const api: NotificationRegistrationApi & { unregister: jest.Mock } = {
    register: jest.fn(async (id: string, registration: DeviceRegistration) => {
      registrations.push({ id, registration });
    }),
    unregister: jest.fn(async () => undefined),
  };

  return { api, registrations };
};

const setup = async (permission?: NotificationPermission) => {
  const { container } = createTestContainer();

  await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
  const store = new MemoryKeyValueStore();
  const push = createMessaging(permission);
  const { api, registrations } = createApi();
  const service = new NotificationService(
    new StorageNotificationSettingRepository(store),
    push.messaging,
    api,
    container.accountService,
    container.networkService,
  );

  return { container, store, push, api, registrations, service };
};

describe('NotificationService', () => {
  it('starts off and registers nothing', async () => {
    const { service, api } = await setup();

    expect(service.getSettings()).toEqual({ enabled: false, topics: { received: true, sent: true, swap: true } });
    await service.sync();
    expect(api.register).not.toHaveBeenCalled();
    expect(api.unregister).not.toHaveBeenCalled();
  });

  it('asks for permission and registers every account address with the enabled topics', async () => {
    const { service, registrations, container } = await setup();
    const listener = jest.fn();

    service.subscribe(listener);
    await expect(service.setEnabled(true)).resolves.toBe(NotificationPermission.GRANTED);

    const network = container.networkService.getCurrentNetwork();
    const address = container.accountService.getAddress(container.accountService.getAccounts()[0], network);

    expect(listener).toHaveBeenCalled();
    expect(service.getSettings().enabled).toBe(true);
    expect(registrations).toHaveLength(1);
    expect(registrations[0].registration).toEqual({
      token: 'token-1',
      platform: 'android',
      subscriptions: [{ chainId: network.chainId, address }],
      topics: ['received', 'sent', 'swap'],
      locale: 'en',
    });
    expect(registrations[0].id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('stays off when the OS refuses the permission', async () => {
    const { service, push, api } = await setup();

    push.messaging.grantOnRequest = NotificationPermission.DENIED;
    await expect(service.setEnabled(true)).resolves.toBe(NotificationPermission.DENIED);
    expect(service.getSettings().enabled).toBe(false);
    expect(api.register).not.toHaveBeenCalled();
  });

  it('re-registers with the filtered topics and keeps the same installation id', async () => {
    const { service, registrations } = await setup();

    await service.setEnabled(true);
    await service.setTopic('sent', false);

    expect(registrations).toHaveLength(2);
    expect(registrations[1].registration.topics).toEqual(['received', 'swap']);
    expect(registrations[1].id).toBe(registrations[0].id);
  });

  it('skips a sync when nothing changed and re-registers on a token refresh', async () => {
    const { service, registrations, push } = await setup();

    await service.setEnabled(true);
    await service.sync();
    expect(registrations).toHaveLength(1);

    service.onTokenRefresh();
    push.messaging.token = 'token-2';
    push.refresh('token-2');
    await service.sync();
    expect(registrations).toHaveLength(2);
    expect(registrations[1].registration.token).toBe('token-2');
  });

  it('unregisters when turned off or when the OS permission is revoked', async () => {
    const { service, api, push } = await setup();

    await service.setEnabled(true);
    await service.setEnabled(false);
    expect(api.unregister).toHaveBeenCalledTimes(1);

    await service.setEnabled(true);
    push.setPermission(NotificationPermission.DENIED);
    await service.sync();
    expect(api.unregister).toHaveBeenCalledTimes(2);
    // Already unregistered: no repeat call.
    await service.sync();
    expect(api.unregister).toHaveBeenCalledTimes(2);
  });

  it('retries a failed registration on the next sync', async () => {
    const { service, api, registrations } = await setup(NotificationPermission.GRANTED);

    (api.register as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(service.setEnabled(true)).rejects.toThrow('offline');
    expect(service.getSettings().enabled).toBe(true);

    await service.sync();
    expect(registrations).toHaveLength(1);
  });

  it('releases the registration captured before a wallet reset', async () => {
    const { service, api, push, registrations, store } = await setup();

    await service.setEnabled(true);
    const release = service.prepareReset();

    store.clearAll();
    await release();

    expect(api.unregister).toHaveBeenCalledWith(registrations[0].id);
    expect(push.messaging.deleteToken).toHaveBeenCalled();
  });

  it('drops the token on reset even when the server cannot be reached', async () => {
    const { service, api, push } = await setup();

    await service.setEnabled(true);
    api.unregister.mockRejectedValueOnce(new Error('offline'));

    await expect(service.prepareReset()()).rejects.toThrow('offline');
    expect(push.messaging.deleteToken).toHaveBeenCalled();
  });

  it('runs the reset release after a sync already in flight', async () => {
    const { service, api } = await setup(NotificationPermission.GRANTED);
    const order: string[] = [];

    (api.register as jest.Mock).mockImplementation(async () => {
      order.push('register');
    });
    api.unregister.mockImplementation(async () => {
      order.push('unregister');
    });
    await service.setEnabled(true);
    order.length = 0;
    const syncing = service.setTopic('sent', false);
    const release = service.prepareReset()();

    await Promise.all([syncing, release]);
    expect(order).toEqual(['register', 'unregister']);
  });

  it('does not call the server on reset when the device was never registered', async () => {
    const { service, api, push } = await setup();

    await service.prepareReset()();
    expect(api.unregister).not.toHaveBeenCalled();
    expect(push.messaging.deleteToken).toHaveBeenCalled();
  });

  it('still unregisters after a token refresh whose re-registration failed', async () => {
    const { service, api, push } = await setup();

    await service.setEnabled(true);
    service.onTokenRefresh();
    push.messaging.token = 'token-2';
    (api.register as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    push.refresh('token-2');
    await service.sync().catch(() => undefined);

    await service.setEnabled(false);
    expect(api.unregister).toHaveBeenCalledTimes(1);
  });
});

describe('StorageNotificationSettingRepository', () => {
  it('falls back to defaults for corrupt or unknown values', () => {
    const store = new MemoryKeyValueStore();

    store.setString('notifications', JSON.stringify({ settings: { enabled: 'yes', topics: { received: false, sent: 1, bogus: true } } }));
    expect(new StorageNotificationSettingRepository(store).getSettings()).toEqual({
      enabled: false,
      topics: { received: false, sent: true, swap: true },
    });
  });
});
