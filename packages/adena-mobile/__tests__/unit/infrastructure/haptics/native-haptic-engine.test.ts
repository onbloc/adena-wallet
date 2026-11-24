import { trigger } from 'react-native-haptic-feedback';

import { HapticKind } from '../../../../src/domain/haptics';
import { nativeHapticEngine } from '../../../../src/infrastructure/haptics/native-haptic-engine';

describe('nativeHapticEngine', () => {
  it('maps haptic kinds to native feedback types and respects system settings', () => {
    nativeHapticEngine.play(HapticKind.IMPACT);
    nativeHapticEngine.play(HapticKind.SELECTION);
    nativeHapticEngine.play(HapticKind.SUCCESS);

    const options = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };

    expect((trigger as jest.Mock).mock.calls).toEqual([
      ['impactLight', options],
      ['selection', options],
      ['notificationSuccess', options],
    ]);
  });
});
