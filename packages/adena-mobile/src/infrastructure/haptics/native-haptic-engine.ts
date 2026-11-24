import type { HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { trigger } from 'react-native-haptic-feedback';

import { HapticKind } from '../../domain/haptics';
import { HapticEngine } from '../../services/haptics.service';

const FEEDBACK: Record<HapticKind, keyof typeof HapticFeedbackTypes> = {
  [HapticKind.IMPACT]: 'impactLight',
  [HapticKind.SELECTION]: 'selection',
  [HapticKind.SUCCESS]: 'notificationSuccess',
};

// Respects the system "touch feedback" setting on Android; no vibration fallback on iOS.
export const nativeHapticEngine: HapticEngine = {
  play: kind => trigger(FEEDBACK[kind], { enableVibrateFallback: false, ignoreAndroidSystemSettings: false }),
};
