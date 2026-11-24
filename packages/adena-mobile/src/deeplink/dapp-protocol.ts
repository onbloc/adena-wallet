import { APP_CONFIG } from '../config/app';
import { AppError, AppErrorCode } from '../core/errors';
import { DappMethod, DappRequest, DappResponse } from '../domain/dapp';
import { decodeBase64Url, encodeBase64Url } from './base64url';

/**
 * Deep link protocol v1
 *
 * Request:  adena://request?payload=<base64url(JSON RequestPayload)>
 * Response: <callback>?response=<base64url(JSON DappResponse)>
 */
export const PROTOCOL_VERSION = 1;
export const REQUEST_HOST = 'request';

const METHODS: DappMethod[] = Object.values(DappMethod);
// intent/content/android-app could launch arbitrary Android components.
const BLOCKED_CALLBACK_SCHEMES = new Set(['http', 'javascript', 'data', 'file', 'about', 'blob', 'intent', 'content', 'android-app', APP_CONFIG.deepLinkScheme]);

interface RequestPayload {
  version: number;
  id: string;
  method: DappMethod;
  callback: string;
  dapp: { name: string; url?: string; icon?: string };
  chainId?: string;
  expiresAt?: number;
  params?: { messages?: unknown[]; memo?: string; gasWanted?: string; gasFee?: string };
}

const invalid = (message: string): never => {
  throw new AppError(AppErrorCode.INVALID_REQUEST, message);
};

const optionalString = (value: unknown, field: string, maxLength = 512): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string' || value.length > maxLength) {
    return invalid(`${field} must be a string up to ${maxLength} characters`);
  }

  return value;
};

const requiredString = (value: unknown, field: string, maxLength?: number): string =>
  optionalString(value, field, maxLength) || invalid(`${field} is required`);

const parseScheme = (url: string): string | null => /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1].toLowerCase() ?? null;

// Returns the identity shown to the user: https origin or custom scheme.
export const getCallbackOrigin = (callbackUrl: string): string => {
  const scheme = parseScheme(callbackUrl);

  if (!scheme || BLOCKED_CALLBACK_SCHEMES.has(scheme)) {
    return invalid('callback must use https or an app scheme');
  }

  if (scheme === 'https') {
    // Plain ASCII host only: browsers read `\`, `%` or unicode differently from what would be shown.
    const host = /^https:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)*(?::\d{1,5})?)(?:[/?#]|$)/i.exec(callbackUrl)?.[1];

    return host ? `https://${host.toLowerCase()}` : invalid('callback is not a valid https URL');
  }

  return `${scheme}:`;
};

const getQueryParam = (url: string, name: string): string | null => {
  const query = url.split('#')[0].split('?')[1];

  if (!query) {
    return null;
  }

  for (const pair of query.split('&')) {
    const [key, ...rest] = pair.split('=');

    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
};

export const isDappRequestUrl = (url: string): boolean =>
  url.toLowerCase().startsWith(`${APP_CONFIG.deepLinkScheme}://${REQUEST_HOST}`);

export const parseDappRequestUrl = (url: string, now: number = Date.now()): DappRequest => {
  if (!isDappRequestUrl(url)) {
    invalid('Not an Adena request link');
  }

  const encoded = getQueryParam(url, 'payload') ?? invalid('payload is missing');

  if (encoded.length > APP_CONFIG.dappRequestMaxBytes) {
    invalid('payload is too large');
  }

  let payload: RequestPayload;

  try {
    payload = JSON.parse(decodeBase64Url(encoded));
  }
  catch {
    return invalid('payload is not valid base64url JSON');
  }

  if (!payload || typeof payload !== 'object') {
    invalid('payload must be an object');
  }

  if (payload.version !== PROTOCOL_VERSION) {
    invalid(`Unsupported protocol version ${String(payload.version)}`);
  }

  if (!METHODS.includes(payload.method)) {
    invalid(`Unsupported method ${String(payload.method)}`);
  }

  const callbackUrl = requiredString(payload.callback, 'callback', 2048);
  const expiresAt = typeof payload.expiresAt === 'number' ? payload.expiresAt : undefined;

  if (expiresAt !== undefined && expiresAt < now) {
    throw new AppError(AppErrorCode.REQUEST_EXPIRED, 'This request has expired');
  }

  const base = {
    requestId: requiredString(payload.id, 'id', 128),
    callbackUrl,
    callbackOrigin: getCallbackOrigin(callbackUrl),
    dapp: {
      name: requiredString(payload.dapp?.name, 'dapp.name', 64),
      url: optionalString(payload.dapp?.url, 'dapp.url', 512),
      icon: optionalString(payload.dapp?.icon, 'dapp.icon', 512),
    },
    chainId: optionalString(payload.chainId, 'chainId', 64),
    expiresAt,
    receivedAt: now,
  };

  if (payload.method === DappMethod.CONNECT) {
    return { ...base, method: DappMethod.CONNECT };
  }

  const params = payload.params ?? invalid('params are required');

  return {
    ...base,
    method: payload.method,
    chainId: base.chainId ?? invalid('chainId is required'),
    messages: Array.isArray(params.messages) ? params.messages : invalid('params.messages must be an array'),
    memo: optionalString(params.memo, 'params.memo', 1024) ?? '',
    gasWanted: optionalString(params.gasWanted, 'params.gasWanted', 32),
    gasFee: optionalString(params.gasFee, 'params.gasFee', 64),
  };
};

export const buildCallbackUrl = (callbackUrl: string, response: DappResponse): string => {
  const [withoutHash, hash] = callbackUrl.split('#');
  const separator = withoutHash.includes('?') ? '&' : '?';
  const encoded = encodeURIComponent(encodeBase64Url(JSON.stringify(response)));

  return `${withoutHash}${separator}response=${encoded}${hash !== undefined ? `#${hash}` : ''}`;
};

// Test and SDK helper: builds a request link from a payload.
export const buildDappRequestUrl = (payload: RequestPayload): string =>
  `${APP_CONFIG.deepLinkScheme}://${REQUEST_HOST}?payload=${encodeURIComponent(encodeBase64Url(JSON.stringify(payload)))}`;

export type { RequestPayload as DappRequestPayload };
