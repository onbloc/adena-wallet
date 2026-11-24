import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';

export interface PasswordAttemptState {
  failures: number;
  lockedUntil: number;
}

export interface PasswordAttemptRepository {
  get(): Promise<PasswordAttemptState>;
  save(state: PasswordAttemptState): Promise<void>;
  clear(): Promise<void>;
}

const EMPTY: PasswordAttemptState = { failures: 0, lockedUntil: 0 };

// Kept in the keychain so wiping general storage does not reset the counter.
export class SecurePasswordAttemptRepository implements PasswordAttemptRepository {
  constructor(
    private readonly secureStore: SecureStore,
    private readonly key: SecureKey = SecureKey.PASSWORD_ATTEMPTS,
  ) {}

  async get(): Promise<PasswordAttemptState> {
    const raw = await this.secureStore.getItem(this.key);

    if (!raw) {
      return EMPTY;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PasswordAttemptState>;

      return {
        failures: Number.isInteger(parsed.failures) && parsed.failures! > 0 ? parsed.failures! : 0,
        lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : 0,
      };
    }
    catch {
      return EMPTY;
    }
  }

  save(state: PasswordAttemptState): Promise<void> {
    return this.secureStore.setItem(this.key, JSON.stringify(state));
  }

  clear(): Promise<void> {
    return this.secureStore.removeItem(this.key);
  }
}
