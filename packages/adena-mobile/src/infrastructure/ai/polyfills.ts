// Web APIs the AI SDK and the MCP client need but React Native does not ship.
// Import this before anything from `adena-ai-llm-poc`; it needs TextEncoder/TextDecoder from app/polyfills.
import { TextDecoderStream, TextEncoderStream } from '@stardazed/streams-text-encoding';
import structuredClone from '@ungap/structured-clone';
import { ReadableStream, TransformStream, WritableStream } from 'web-streams-polyfill';

const globalScope = globalThis as unknown as Record<string, unknown>;

function install(name: string, value: unknown): void {
  if (typeof globalScope[name] === 'undefined') {
    globalScope[name] = value;
  }
}

// Streams first: the text-encoding streams are built on TransformStream.
install('ReadableStream', ReadableStream);
install('WritableStream', WritableStream);
install('TransformStream', TransformStream);
install('TextEncoderStream', TextEncoderStream);
install('TextDecoderStream', TextDecoderStream);
install('structuredClone', structuredClone);
