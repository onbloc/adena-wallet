import { EVENT_KEYS } from '@common/constants/event-key.constant';

declare global {
  declare module '*.svg';

  interface WindowEventMap {
    [EVENT_KEYS.changedAccount]: CustomEvent<string>;
    [EVENT_KEYS.changedNetwork]: CustomEvent;
  }
}
