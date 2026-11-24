import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Android-only module that finishes the overlay inject sheet (InjectSheetActivity).
// Every call names the sheet by the token it received in its launch options.
export interface Spec extends TurboModule {
  // Opens the callback URL (never returned as an activity result) and closes that sheet.
  complete(sheetToken: string, callbackUrl: string): void;
  dismiss(sheetToken: string): void;
  // Back was pressed on the sheet with this token; JS answers the dApp, then completes or dismisses.
  readonly onDismissRequest: CodegenTypes.EventEmitter<string>;
}

export default TurboModuleRegistry.get<Spec>('AdenaInjectSheet');
