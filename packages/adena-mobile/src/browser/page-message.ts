import type {InjectionMessage} from '@inject/message/message';

import {isAllowedOrigin, splitOrigin} from './url-origin';

/** Largest request accepted from a page (an AddPackage with sources can be big). */
export const MAX_MESSAGE_BYTES = 2 * 1024 * 1024;

export interface IncomingPageMessage {
  raw: string;
  /** Origin of the top-level page according to the WebView's own navigation state. */
  nativeOrigin: string | null;
  nativeUrl: string;
  token: string;
}

export type RouteResult =
  | {accepted: true; message: InjectionMessage}
  | {accepted: false; reason: string};

/**
 * Checks a message from the page and, if it passes, hands it to the
 * extension's MessageHandler (the same code the extension's background runs).
 * The origin always comes from native navigation state; whatever the page
 * claims about itself is only compared against it, never trusted.
 */
export function parsePageMessage(input: IncomingPageMessage): RouteResult {
  if (input.raw.length > MAX_MESSAGE_BYTES) {
    return {accepted: false, reason: 'too-large'};
  }
  let envelope: any;
  try {
    envelope = JSON.parse(input.raw);
  } catch {
    return {accepted: false, reason: 'not-json'};
  }
  if (envelope?.channel !== 'adena' || envelope.token !== input.token) {
    return {accepted: false, reason: 'bad-token'};
  }
  if (!isAllowedOrigin(input.nativeOrigin)) {
    return {accepted: false, reason: 'origin-not-allowed'};
  }
  if (envelope.origin !== input.nativeOrigin) {
    return {accepted: false, reason: 'origin-mismatch'};
  }
  const message = envelope.message;
  if (
    !message ||
    message.status !== 'request' ||
    typeof message.type !== 'string'
  ) {
    return {accepted: false, reason: 'not-a-request'};
  }
  const {protocol, hostname} = splitOrigin(input.nativeOrigin);
  return {accepted: true, message: {...message, protocol, hostname}};
}
