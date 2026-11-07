import type { AxiosInstance } from 'axios';

/**
 * Where the dApp request handlers (InjectCore) read the extension's own
 * bundled resources, such as `/resources/chains/chains.json`.
 *
 * The extension serves them from its origin, so a plain axios instance works
 * and nothing is registered. The mobile app has no such origin; it registers a
 * client that answers those paths from the app bundle.
 */
let client: AxiosInstance | null = null;

export function setLocalResourceClient(next: AxiosInstance | null): void {
  client = next;
}

export function getLocalResourceClient(): AxiosInstance | null {
  return client;
}
