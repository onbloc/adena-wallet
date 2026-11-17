/**
 * How the dApp request handlers (InjectCore) read the session password.
 *
 * In the extension they run in the service worker, next to the in-memory key
 * that sealed the password, so they decrypt it themselves and no reader is
 * registered. The mobile app seals the password inside its in-process
 * messenger with a different key and cipher; it registers that messenger's
 * reader here so the handlers get the same password the UI unlocked with.
 */
export type SessionPasswordReader = (iv: string, encryptedPassword: string) => Promise<string>;

let reader: SessionPasswordReader | null = null;

export function setSessionPasswordReader(next: SessionPasswordReader | null): void {
  reader = next;
}

export function getSessionPasswordReader(): SessionPasswordReader | null {
  return reader;
}
