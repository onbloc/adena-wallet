export enum AlarmKey {
  EXPIRED_PASSWORD = 'EXPIRED_PASSWORD',
  WAKE_ALARM = 'WAKE_ALARM',
  WAKE_ALARM_DELAY_15S = 'WAKE_ALARM_DELAY_15S',
  WAKE_ALARM_DELAY_30S = 'WAKE_ALARM_DELAY_30S',
  WAKE_ALARM_DELAY_45S = 'WAKE_ALARM_DELAY_45S',
}

export const SCHEDULE_ALARMS: { key: string; periodInMinutes: number; delay: number }[] = [
  { key: AlarmKey.EXPIRED_PASSWORD, periodInMinutes: 1, delay: 0 },
  { key: AlarmKey.WAKE_ALARM, periodInMinutes: 1, delay: 0 },
  { key: AlarmKey.WAKE_ALARM_DELAY_15S, periodInMinutes: 1, delay: 15_000 },
  { key: AlarmKey.WAKE_ALARM_DELAY_30S, periodInMinutes: 1, delay: 30_000 },
  { key: AlarmKey.WAKE_ALARM_DELAY_45S, periodInMinutes: 1, delay: 45_000 },
];
