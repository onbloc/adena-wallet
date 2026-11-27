import {
  enabledTopics,
  NotificationPermission,
  NotificationSettings,
  NotificationTopic,
} from '../domain/notification';
import { DeviceRegistration, NotificationRegistrationApi, PushPlatform } from '../infrastructure/http/notification-api.client';
import { NotificationSettingRepository } from '../repositories/notification-setting.repository';
import { createId } from '../utils/id';
import { AccountService } from './account.service';
import { NetworkService } from './network.service';

export interface PushMessage {
  title?: string;
  body?: string;
  data: Record<string, string>;
}

// Device push transport (FCM in the native container).
export interface PushMessaging {
  readonly platform: PushPlatform;
  getPermission(): Promise<NotificationPermission>;
  // Shows the OS prompt when the user has not decided yet.
  requestPermission(): Promise<NotificationPermission>;
  getToken(): Promise<string>;
  deleteToken(): Promise<void>;
  onTokenRefresh(listener: (token: string) => void): () => void;
  // Messages received while the app is in the foreground (the OS does not show them).
  onForegroundMessage(listener: (message: PushMessage) => void): () => void;
}

export const UNAVAILABLE_PUSH_MESSAGING: PushMessaging = {
  platform: 'ios',
  getPermission: async () => NotificationPermission.UNAVAILABLE,
  requestPermission: async () => NotificationPermission.UNAVAILABLE,
  getToken: async () => {
    throw new Error('Push messaging is unavailable');
  },
  deleteToken: async () => undefined,
  onTokenRefresh: () => () => undefined,
  onForegroundMessage: () => () => undefined,
};

export type NotificationListener = () => void;

// Keeps the local notification settings and the server registration in step.
export class NotificationService {
  private readonly listeners = new Set<NotificationListener>();
  private syncing: Promise<void> = Promise.resolve();

  constructor(
    private readonly repository: NotificationSettingRepository,
    private readonly messaging: PushMessaging,
    private readonly api: NotificationRegistrationApi,
    private readonly accountService: AccountService,
    private readonly networkService: NetworkService,
    private readonly locale: () => string = () => 'en',
  ) {}

  getSettings(): NotificationSettings {
    return this.repository.getSettings();
  }

  getPermission(): Promise<NotificationPermission> {
    return this.messaging.getPermission();
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  // Turning on asks for OS permission first; the switch stays off unless it is granted.
  async setEnabled(enabled: boolean): Promise<NotificationPermission> {
    const permission = enabled ? await this.messaging.requestPermission() : await this.messaging.getPermission();

    if (enabled && permission !== NotificationPermission.GRANTED) {
      return permission;
    }

    this.update({ enabled });
    await this.sync();
    return permission;
  }

  async setTopic(topic: NotificationTopic, value: boolean): Promise<void> {
    this.update({ topics: { [topic]: value } });
    await this.sync();
  }

  // Serialized so overlapping triggers (toggle, foreground, token refresh) never race on the server.
  sync(): Promise<void> {
    return this.enqueue(() => this.syncNow());
  }

  // Factory reset wipes local storage, so the registration is captured before and released after it.
  // The returned step queues behind any in-flight sync and always drops the FCM token, even offline.
  prepareReset(): () => Promise<void> {
    const installationId = this.repository.getInstallationId();
    const registered = this.repository.getSyncedFingerprint() !== null;

    return () => this.enqueue(async () => {
      try {
        if (installationId && registered) {
          await this.api.unregister(installationId);
        }
      }
      finally {
        await this.messaging.deleteToken().catch(() => undefined);
      }
    });
  }

  onForegroundMessage(listener: (message: PushMessage) => void): () => void {
    return this.messaging.onForegroundMessage(listener);
  }

  // The fingerprint includes the token, so a refreshed token re-registers on its own.
  onTokenRefresh(): () => void {
    return this.messaging.onTokenRefresh(() => {
      this.sync().catch(() => undefined);
    });
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.syncing.then(task);

    this.syncing = run.catch(() => undefined);
    return run;
  }

  private update(patch: Parameters<NotificationSettingRepository['updateSettings']>[0]): void {
    this.repository.updateSettings(patch);
    this.listeners.forEach(listener => listener());
  }

  private installationId(): string {
    const existing = this.repository.getInstallationId();

    if (existing) {
      return existing;
    }

    const created = createId();

    this.repository.setInstallationId(created);
    return created;
  }

  private async syncNow(): Promise<void> {
    const settings = this.repository.getSettings();
    const permission = await this.messaging.getPermission();
    const active = settings.enabled && permission === NotificationPermission.GRANTED;
    const synced = this.repository.getSyncedFingerprint();

    if (!active) {
      // Nothing was registered, or a previous unregister already went through.
      if (synced === null) {
        return;
      }

      await this.api.unregister(this.installationId());
      this.repository.setSyncedFingerprint(null);
      return;
    }

    const registration = await this.buildRegistration(settings);
    const fingerprint = JSON.stringify(registration);

    if (fingerprint === synced) {
      return;
    }

    await this.api.register(this.installationId(), registration);
    this.repository.setSyncedFingerprint(fingerprint);
  }

  private async buildRegistration(settings: NotificationSettings): Promise<DeviceRegistration> {
    const network = this.networkService.getCurrentNetwork();
    const addresses = new Set(this.accountService.getAccounts().map(account => this.accountService.getAddress(account, network)));

    return {
      token: await this.messaging.getToken(),
      platform: this.messaging.platform,
      subscriptions: [...addresses].sort().map(address => ({ chainId: network.chainId, address })),
      topics: enabledTopics(settings.topics),
      locale: this.locale(),
    };
  }
}
