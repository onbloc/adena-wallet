import { Platform } from 'react-native';
import structuredClone from '@ungap/structured-clone';

// Web APIs the AI SDK needs but React Native lacks.
if (Platform.OS !== 'web') {
  // require (not import): runs synchronously before the rest of the app.
  const {
    polyfillGlobal,
  } = require('react-native/Libraries/Utilities/PolyfillFunctions');
  const {
    TextEncoderStream,
    TextDecoderStream,
  } = require('@stardazed/streams-text-encoding');

  if (!('structuredClone' in global)) {
    polyfillGlobal('structuredClone', () => structuredClone);
  }

  polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
  polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
}

export {};
