export type EventKeyType = 'changedAccount' | 'changedNetwork';

export const EVENT_KEYS: { [key in EventKeyType]: string } = {
  changedAccount: 'ADNEA_CHANGED_ACCOUNT',
  changedNetwork: 'ADENA_CHANGED_NETWORK',
};
