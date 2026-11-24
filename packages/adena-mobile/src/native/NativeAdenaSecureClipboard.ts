import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Copies a secret marked as sensitive: Android hides it from clipboard previews (API 33+),
// iOS keeps it off Universal Clipboard and expires it.
export interface Spec extends TurboModule {
  setSensitiveString(value: string, expiresInMs: number): void;
}

export default TurboModuleRegistry.get<Spec>('AdenaSecureClipboard');
