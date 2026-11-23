import 'react-native-get-random-values';

import { Buffer } from 'buffer';

import { Utf8TextDecoder } from '../shims/text-decoder';

const globalScope = globalThis as unknown as Record<string, unknown>;

if (typeof globalScope.Buffer === 'undefined') {
  globalScope.Buffer = Buffer;
}

if (typeof globalScope.TextDecoder === 'undefined') {
  globalScope.TextDecoder = Utf8TextDecoder;
}
