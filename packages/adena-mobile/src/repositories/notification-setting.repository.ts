import { DEFAULT_NOTIFICATION_SETTINGS, NOTIFICATION_TOPIC_OPTIONS, NotificationSettings, NotificationTopics } from '../domain/notification';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

interface StoredNotificationState {
  settings?: Partial<NotificationSettings>;
  // Random per-install id the server keys the device on, so a refreshed token replaces the old one.
  installationId?: string;
  // Fingerprint of the last registration the server accepted; skips redundant syncs.
  syncedFingerprint?: string | null;
}

const sanitizeTopics = (stored: Partial<NotificationTopics> | undefined): NotificationTopics => {
  const topics = { ...DEFAULT_NOTIFICATION_SETTINGS.topics };

  NOTIFICATION_TOPIC_OPTIONS.forEach(({ topic }) => {
    if (typeof stored?.[topic] === 'boolean') {
      topics[topic] = stored[topic];
    }
  });
  return topics;
};

const sanitize = (stored: Partial<NotificationSettings> | undefined): NotificationSettings => ({
  enabled: typeof stored?.enabled === 'boolean' ? stored.enabled : DEFAULT_NOTIFICATION_SETTINGS.enabled,
  topics: sanitizeTopics(stored?.topics),
});

export interface NotificationSettingRepository {
  getSettings(): NotificationSettings;
  updateSettings(patch: { enabled?: boolean; topics?: Partial<NotificationTopics> }): NotificationSettings;
  getInstallationId(): string | undefined;
  setInstallationId(id: string): void;
  getSyncedFingerprint(): string | null;
  setSyncedFingerprint(fingerprint: string | null): void;
}

export class StorageNotificationSettingRepository implements NotificationSettingRepository {
  constructor(private readonly store: KeyValueStore) {}

  private read(): StoredNotificationState {
    return readJson<StoredNotificationState>(this.store, StorageKey.NOTIFICATIONS) ?? {};
  }

  private write(patch: StoredNotificationState): void {
    writeJson(this.store, StorageKey.NOTIFICATIONS, { ...this.read(), ...patch });
  }

  getSettings(): NotificationSettings {
    return sanitize(this.read().settings);
  }

  updateSettings(patch: { enabled?: boolean; topics?: Partial<NotificationTopics> }): NotificationSettings {
    const current = this.getSettings();
    const next = sanitize({
      enabled: patch.enabled ?? current.enabled,
      topics: { ...current.topics, ...patch.topics },
    });

    this.write({ settings: next });
    return next;
  }

  getInstallationId(): string | undefined {
    const id = this.read().installationId;

    return typeof id === 'string' && id ? id : undefined;
  }

  setInstallationId(id: string): void {
    this.write({ installationId: id });
  }

  getSyncedFingerprint(): string | null {
    return this.read().syncedFingerprint ?? null;
  }

  setSyncedFingerprint(fingerprint: string | null): void {
    this.write({ syncedFingerprint: fingerprint });
  }
}
