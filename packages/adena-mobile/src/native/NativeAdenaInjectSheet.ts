import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Android-only module that finishes the overlay inject sheet (InjectSheetActivity).
export interface Spec extends TurboModule {
  // Opens the callback URL (never returned as an activity result) and closes the sheet.
  complete(callbackUrl: string): void;
  dismiss(): void;
}

export default TurboModuleRegistry.get<Spec>('AdenaInjectSheet');
