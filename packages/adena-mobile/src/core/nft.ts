import type {GRC721CollectionModel} from '@types';

import {originOf} from '../browser/url-origin';

/**
 * The extension's addCollections: refresh stored entries from the chain (the
 * user's `display` choice stays) and append newly discovered ones as shown.
 */
export function mergeCollections(
  stored: GRC721CollectionModel[],
  fetched: GRC721CollectionModel[],
): GRC721CollectionModel[] {
  const same = (a: GRC721CollectionModel, b: GRC721CollectionModel) =>
    a.packagePath === b.packagePath && a.networkId === b.networkId;
  const refreshed = stored.map(item => {
    const found = fetched.find(next => same(next, item));
    return found ? {...item, ...found, display: item.display} : item;
  });
  const added = fetched
    .filter(next => !stored.some(item => same(next, item)))
    .map(next => ({...next, display: true}));
  return [...refreshed, ...added];
}

/** Shown collections, pinned ones first in pin order. */
export function sortCollections(
  collections: GRC721CollectionModel[],
  pinned: string[],
): GRC721CollectionModel[] {
  const shown = collections.filter(item => item.display);
  const first = pinned
    .map(path => shown.find(item => item.packagePath === path))
    .filter((item): item is GRC721CollectionModel => !!item);
  const rest = shown.filter(item => !pinned.includes(item.packagePath));
  return [...first, ...rest];
}

export function setCollectionDisplay(
  collections: GRC721CollectionModel[],
  packagePath: string,
  display: boolean,
): GRC721CollectionModel[] {
  return collections.map(item =>
    item.packagePath === packagePath ? {...item, display} : item,
  );
}

export function togglePinned(pinned: string[], packagePath: string): string[] {
  return pinned.includes(packagePath)
    ? pinned.filter(path => path !== packagePath)
    : [...pinned, packagePath];
}

/** Inline images: raster formats only, at most this many characters. */
export const MAX_DATA_URI_LENGTH = 2_000_000;
/** Remote images larger than this, when the server says so, are not loaded. */
export const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;

const RASTER_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export type NftImage =
  | {kind: 'inline'; uri: string}
  | {kind: 'remote'; uri: string}
  | {kind: 'none'};

/**
 * Which token URIs the app may load. The URI is whatever the collection's
 * realm returns, so it is untrusted: https only (no credentials, no plain
 * http, no ipfs:// or other schemes), and inline data only as a small raster
 * image. SVG is refused; it can carry scripts and links and the native image
 * view cannot draw it anyway.
 */
export function classifyNftImage(uri: string | null | undefined): NftImage {
  const value = (uri ?? '').trim();
  if (!value) {
    return {kind: 'none'};
  }
  const inline = /^data:(image\/[a-z+.-]+);base64,[A-Za-z0-9+/=]+$/i.exec(
    value,
  );
  if (inline) {
    return RASTER_TYPES.includes(inline[1].toLowerCase()) &&
      value.length <= MAX_DATA_URI_LENGTH
      ? {kind: 'inline', uri: value}
      : {kind: 'none'};
  }
  const origin = originOf(value);
  if (origin?.startsWith('https://') && /^\S+$/.test(value)) {
    return {kind: 'remote', uri: value};
  }
  return {kind: 'none'};
}

/**
 * Asks the server what it would send before the image view downloads it.
 * Refuses a declared non-raster type or a declared size over the limit. A
 * server that does not answer HEAD gets the benefit of the doubt: the image
 * view still decodes only image data.
 */
export async function remoteImageAllowed(
  uri: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 5_000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(uri, {
      method: 'HEAD',
      signal: controller.signal,
      credentials: 'omit',
    });
    if (!response.ok) {
      return true;
    }
    const type = (response.headers.get('content-type') ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (type && !RASTER_TYPES.includes(type)) {
      return false;
    }
    const length = Number(response.headers.get('content-length'));
    return !(Number.isFinite(length) && length > MAX_REMOTE_IMAGE_BYTES);
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}
