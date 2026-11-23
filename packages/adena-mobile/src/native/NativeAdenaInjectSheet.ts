import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Android-only module that finishes the overlay inject sheet (InjectSheetActivity).
export interface Spec extends TurboModule {
  // Returns the response to a startActivityForResult caller, or opens the callback URL.
  complete(callbackUrl: string): void;
  dismiss(): void;
}

export default TurboModuleRegistry.get<Spec>('AdenaInjectSheet');
