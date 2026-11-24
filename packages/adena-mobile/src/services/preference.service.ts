import { PreferenceRepository, Preferences } from '../repositories/preference.repository';

export type PreferenceListener = () => void;

export class PreferenceService {
  private readonly listeners = new Set<PreferenceListener>();

  constructor(private readonly preferenceRepository: PreferenceRepository) {}

  get(): Preferences {
    return this.preferenceRepository.get();
  }

  update(patch: Partial<Omit<Preferences, 'biometricUnlockEnabled'>>): Preferences {
    const next = this.preferenceRepository.update(patch);

    this.listeners.forEach(listener => listener());
    return next;
  }

  // Notified after every update through this service (e.g. theme or balance filters).
  subscribe(listener: PreferenceListener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }
}
