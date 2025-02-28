export enum AlarmKey {
  EXPIRED_PASSWORD = 'EXPIRED_PASSWORD',
  WAKE_ALARM = 'WAKE_ALARM',
  WAKE_ALARM_DELAY_20S = 'WAKE_ALARM_DELAY_20S',
  WAKE_ALARM_DELAY_40S = 'WAKE_ALARM_DELAY_40S',
}

export const SCHEDULE_ALARMS: { key: string; periodInMinutes: number; delay: number }[] = [
  { key: AlarmKey.EXPIRED_PASSWORD, periodInMinutes: 1, delay: 0 },
  { key: AlarmKey.WAKE_ALARM, periodInMinutes: 1, delay: 0 },
  { key: AlarmKey.WAKE_ALARM_DELAY_20S, periodInMinutes: 1, delay: 20_000 },
  { key: AlarmKey.WAKE_ALARM_DELAY_40S, periodInMinutes: 1, delay: 40_000 },
];
