import { NotificationTopic } from '../../domain/notification';
import { HttpClient } from './http-client';

// Proposed contract of the push registration server (REMOTE_RESOURCES.notificationApiBase).

export type PushPlatform = 'ios' | 'android';

export interface DeviceSubscription {
  chainId: string;
  address: string;
}

export interface DeviceRegistration {
  // FCM registration token.
  token: string;
  platform: PushPlatform;
  // Addresses to watch; the server sends nothing for others.
  subscriptions: DeviceSubscription[];
  // Only these categories are pushed.
  topics: NotificationTopic[];
  locale: string;
}

export interface NotificationRegistrationApi {
  // PUT /v1/devices/{installationId}: creates or fully replaces the registration.
  register(installationId: string, registration: DeviceRegistration): Promise<void>;
  // DELETE /v1/devices/{installationId}: stops every push to this install.
  unregister(installationId: string): Promise<void>;
}

export class NotificationApiClient implements NotificationRegistrationApi {
  constructor(private readonly http: HttpClient, private readonly baseUrl: string) {}

  private url(installationId: string): string {
    return `${this.baseUrl.replace(/\/+$/, '')}/v1/devices/${encodeURIComponent(installationId)}`;
  }

  async register(installationId: string, registration: DeviceRegistration): Promise<void> {
    await this.http.request(this.url(installationId), { method: 'PUT', body: registration });
  }

  async unregister(installationId: string): Promise<void> {
    await this.http.request(this.url(installationId), { method: 'DELETE' });
  }
}

// Used while no server is configured: registration is a no-op.
export const NOOP_NOTIFICATION_API: NotificationRegistrationApi = {
  register: async () => undefined,
  unregister: async () => undefined,
};
