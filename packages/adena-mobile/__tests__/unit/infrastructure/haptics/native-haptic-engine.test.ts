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

  it('turns itself off when the native module is missing instead of throwing', () => {
    jest.isolateModules(() => {
      const { trigger: isolatedTrigger } = jest.requireMock<typeof import('react-native-haptic-feedback')>('react-native-haptic-feedback');
      const { nativeHapticEngine: engine } = jest.requireActual<typeof import('../../../../src/infrastructure/haptics/native-haptic-engine')>('../../../../src/infrastructure/haptics/native-haptic-engine');

      jest.mocked(isolatedTrigger).mockClear().mockImplementationOnce(() => {
        throw new Error('RNHapticFeedback could not be found');
      });

      expect(() => engine.play(HapticKind.IMPACT)).not.toThrow();
      engine.play(HapticKind.SELECTION);
      expect(isolatedTrigger).toHaveBeenCalledTimes(1);
    });
  });
});
