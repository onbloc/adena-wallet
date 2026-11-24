import type { HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { trigger } from 'react-native-haptic-feedback';

import { HapticKind } from '../../domain/haptics';
import { HapticEngine } from '../../services/haptics.service';

const FEEDBACK: Record<HapticKind, keyof typeof HapticFeedbackTypes> = {
  [HapticKind.IMPACT]: 'impactLight',
  [HapticKind.SELECTION]: 'selection',
  [HapticKind.SUCCESS]: 'notificationSuccess',
};

let available = true;

// Respects the system "touch feedback" setting on Android; no vibration fallback on iOS.
// Haptics are optional: a binary without the native module turns them off instead of failing the tap.
export const nativeHapticEngine: HapticEngine = {
  play: (kind) => {
    if (!available) {
      return;
    }

    try {
      trigger(FEEDBACK[kind], { enableVibrateFallback: false, ignoreAndroidSystemSettings: false });
    }
    catch {
      available = false;
    }
  },
};
