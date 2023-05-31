export const EVENT_KEYS = {
  changedAccount: 'ADNEA_CHANGED_ACCOUNT',
  changedNetwork: 'ADENA_CHANGED_NETWORK',
} as const;
export type EventKeyType = keyof typeof EVENT_KEYS;
export type EventValueType = (typeof EVENT_KEYS)[keyof typeof EVENT_KEYS];
