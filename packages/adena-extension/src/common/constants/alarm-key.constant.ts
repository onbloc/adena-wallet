export enum AlarmKey {
  EXPIRED_PASSWORD = 'EXPIRED_PASSWORD',
  WAKE_ALARM = 'WAKE_ALARM',
  WAKE_ALARM_DELAY_20S = 'WAKE_ALARM_DELAY_20S',
  WAKE_ALARM_DELAY_40S = 'WAKE_ALARM_DELAY_40S',
}

export const SCHEDULE_ALARMS: { key: string; periodInMinutes: number }[] = [
  { key: AlarmKey.EXPIRED_PASSWORD, periodInMinutes: 1 },
  { key: AlarmKey.WAKE_ALARM, periodInMinutes: 1 },
  { key: AlarmKey.WAKE_ALARM_DELAY_20S, periodInMinutes: 1 },
  { key: AlarmKey.WAKE_ALARM_DELAY_40S, periodInMinutes: 1 },
];
