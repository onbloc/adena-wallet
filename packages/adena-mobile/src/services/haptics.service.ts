import { HapticKind } from '../domain/haptics';
import { PreferenceRepository } from '../repositories/preference.repository';

export interface HapticEngine {
  play(kind: HapticKind): void;
}

export const NOOP_HAPTIC_ENGINE: HapticEngine = { play: () => undefined };

// Plays haptics only while the "Haptic touch" preference is on; read per call so a toggle applies at once.
export class HapticsService {
  constructor(
    private readonly preferenceRepository: PreferenceRepository,
    private readonly engine: HapticEngine,
  ) {}

  play = (kind: HapticKind = HapticKind.IMPACT): void => {
    if (!this.preferenceRepository.get().hapticsEnabled) {
      return;
    }

    try {
      this.engine.play(kind);
    }
    catch {
      // Feedback is best effort; a device without a haptic engine must not break the press.
    }
  };
}
