import { EVENT_KEYS } from '@common/constants/event-key.constant';

export const _ = '';

declare global {
  interface Window {
    adena?: any;
  }

  declare module '*.svg';
  declare module '*.gif';

  interface WindowEventMap {
    [EVENT_KEYS.changedAccount]: CustomEvent<string>;
    [EVENT_KEYS.changedNetwork]: CustomEvent<string>;
  }
}
