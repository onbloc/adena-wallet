// Push categories the server filters on; adding a category only means adding an entry here.
export const NotificationTopic = {
  RECEIVED: 'received',
  SENT: 'sent',
  SWAP: 'swap',
} as const;

export type NotificationTopic = (typeof NotificationTopic)[keyof typeof NotificationTopic];

export interface NotificationTopicOption {
  topic: NotificationTopic;
  name: string;
  description: string;
}

export const NOTIFICATION_TOPIC_OPTIONS: readonly NotificationTopicOption[] = [
  { topic: NotificationTopic.RECEIVED, name: 'Received', description: 'When tokens arrive in one of your accounts.' },
  { topic: NotificationTopic.SENT, name: 'Sent', description: 'When a transfer you sent is confirmed on-chain.' },
  { topic: NotificationTopic.SWAP, name: 'Swaps', description: 'When a swap you made is confirmed on-chain.' },
];

export type NotificationTopics = Record<NotificationTopic, boolean>;

export interface NotificationSettings {
  // Master switch; topics keep their values while it is off.
  enabled: boolean;
  topics: NotificationTopics;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  topics: { received: true, sent: true, swap: true },
};

export const NotificationPermission = {
  GRANTED: 'granted',
  DENIED: 'denied',
  NOT_DETERMINED: 'notDetermined',
  // No push provider on this build (e.g. Firebase is not configured).
  UNAVAILABLE: 'unavailable',
} as const;

export type NotificationPermission = (typeof NotificationPermission)[keyof typeof NotificationPermission];

export const isNotificationTopic = (value: unknown): value is NotificationTopic =>
  NOTIFICATION_TOPIC_OPTIONS.some(option => option.topic === value);

export const enabledTopics = (topics: NotificationTopics): NotificationTopic[] =>
  NOTIFICATION_TOPIC_OPTIONS.map(option => option.topic).filter(topic => topics[topic]);
