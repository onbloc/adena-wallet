import { HapticKind } from '../../../src/domain/haptics';
import { StoragePreferenceRepository } from '../../../src/repositories/preference.repository';
import { HapticsService } from '../../../src/services/haptics.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

const setup = () => {
  const preferences = new StoragePreferenceRepository(new MemoryKeyValueStore());
  const engine = { play: jest.fn() };

  return { preferences, engine, service: new HapticsService(preferences, engine) };
};

describe('HapticsService', () => {
  it('plays a light impact by default while haptics are enabled', () => {
    const { service, engine } = setup();

    service.play();
    service.play(HapticKind.SUCCESS);
    expect(engine.play.mock.calls).toEqual([[HapticKind.IMPACT], [HapticKind.SUCCESS]]);
  });

  it('follows the Haptic touch preference on every call', () => {
    const { service, engine, preferences } = setup();

    preferences.update({ hapticsEnabled: false });
    service.play(HapticKind.SELECTION);
    expect(engine.play).not.toHaveBeenCalled();

    preferences.update({ hapticsEnabled: true });
    service.play(HapticKind.SELECTION);
    expect(engine.play).toHaveBeenCalledWith(HapticKind.SELECTION);
  });

  it('swallows engine failures', () => {
    const { service, engine } = setup();

    engine.play.mockImplementation(() => {
      throw new Error('No haptic engine');
    });
    expect(() => service.play()).not.toThrow();
  });
});
