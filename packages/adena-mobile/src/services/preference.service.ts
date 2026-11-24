import { PreferenceRepository, Preferences } from '../repositories/preference.repository';

export class PreferenceService {
  constructor(private readonly preferenceRepository: PreferenceRepository) {}

  get(): Preferences {
    return this.preferenceRepository.get();
  }

  update(patch: Partial<Omit<Preferences, 'biometricUnlockEnabled'>>): Preferences {
    return this.preferenceRepository.update(patch);
  }
}
