import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Copies a secret marked as sensitive and clears it at `expiresInMs`, also while backgrounded
// (Android: an alarm plus a persisted marker, so the deadline also survives process death).
// Android hides it from clipboard previews (API 33+); iOS keeps it off Universal Clipboard.
export interface Spec extends TurboModule {
  setSensitiveString(value: string, expiresInMs: number): void;
  // Drops the pending expiry once JS has wiped or let go of the copy (no-op on iOS).
  cancelExpiry(): void;
}

export default TurboModuleRegistry.get<Spec>('AdenaSecureClipboard');
