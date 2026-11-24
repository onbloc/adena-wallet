import { TM2Error } from '@gnolang/tm2-js-client';

import { ChainFamily, Network } from '../../../domain/network';
import { NftCollection, NftItem, NftMetadata, Page } from '../../../domain/nft';
import { OnblocApiClient } from '../../../infrastructure/http/onbloc-api.client';
import { NftRepository, NftTransferParams } from '../nft-repository';
import { GnoMessage, GnoMessageType } from './gno-messages';
import { GnoProviderFactory } from './gno-provider';
import { decodeGoString, gnoLiteral, parseQEvalResult } from './gno-qeval';

const MAX_URI_LENGTH = 2 * 1024 * 1024;
// Bounds how many API pages one getItems call reads while skipping empty or operated-only pages.
const MAX_PAGES_PER_CALL = 10;
// Thumbnail lookup reads a few small pages looking for an owned token before giving up.
const THUMBNAIL_PAGE_SIZE = 20;
const THUMBNAIL_MAX_PAGES = 3;

// getItems cursor: index into collectionIds plus that collection's own API cursor.
const encodeCursor = (index: number, cursor: string | null): string => `${index}:${cursor ?? ''}`;

const decodeCursor = (cursor: string | null | undefined): { index: number; cursor: string | null } => {
  const match = cursor ? /^(\d+):(.*)$/s.exec(cursor) : null;

  return match ? { index: Number(match[1]), cursor: match[2] || null } : { index: 0, cursor: null };
};

// A trailing error tuple other than a nil `(undefined)` means the call failed.
const readStringResult = (raw: string): string | null => {
  const [value, error] = parseQEvalResult(raw);

  if (!value || (error && error.value !== 'undefined')) {
    return null;
  }

  const decoded = decodeGoString(value.value);

  return decoded && decoded.length <= MAX_URI_LENGTH ? decoded : null;
};

// The node answered with an ABCI error (e.g. a realm panic): a genuine "no value", not a transport failure.
const isChainAnswer = (error: unknown): boolean => error instanceof TM2Error;

// Transport failures and timeouts propagate so callers can retry; chain-level errors read as empty.
const evaluateOrEmpty = async (evaluate: () => Promise<string>): Promise<string> => {
  try {
    return await evaluate();
  }
  catch (error) {
    if (isChainAnswer(error)) {
      return '';
    }

    throw error;
  }
};

const toMetadata = (json: Record<string, unknown>): NftMetadata => {
  const attributes = Array.isArray(json.attributes) ? json.attributes : [];
  const text = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined);

  return {
    name: text(json.name),
    description: text(json.description),
    image: text(json.image) ?? text(json.image_data) ?? text(json.imageData),
    externalUrl: text(json.external_url) ?? text(json.externalUrl),
    attributes: attributes
      .map(item => item as Record<string, unknown>)
      .map(item => ({
        traitType: String(item.trait_type ?? item.traitType ?? ''),
        value: String(item.value ?? ''),
      }))
      .filter(item => item.traitType || item.value),
  };
};

export class GnoNftRepository implements NftRepository {
  readonly family = ChainFamily.GNO;

  constructor(private readonly providerFactory: GnoProviderFactory, private readonly api: OnblocApiClient) {}

  // Collections come from the account API, as in the extension; no API means no NFT listing.
  // Realms are grouped into one entry that keeps every collection id. Tokens the account only
  // operates (e.g. staked) are excluded: their transfer needs the owner, not this account.
  async getCollections(address: string, network: Network): Promise<NftCollection[]> {
    if (!network.apiUrl) {
      return [];
    }

    const apiUrl = network.apiUrl;
    const owned = (await this.api.getAccountCollections(apiUrl, address)).filter(item => item.ownedCount > 0);
    const byPackage = new Map<string, { ids: string[]; name: string; symbol: string; count: number }>();

    owned.forEach((item) => {
      const current = byPackage.get(item.packagePath);
      const id = item.tokenId || item.packagePath;

      byPackage.set(item.packagePath, {
        ids: current ? (current.ids.includes(id) ? current.ids : [...current.ids, id]) : [id],
        name: current?.name ?? item.name,
        symbol: current?.symbol ?? item.symbol,
        count: (current?.count ?? 0) + item.ownedCount,
      });
    });

    return Promise.all([...byPackage.entries()].map(async ([packagePath, info]) => {
      const [thumbnailNftId, capabilities] = await Promise.all([
        this.findThumbnail(apiUrl, address, info.ids).catch(() => undefined),
        this.getCapabilities(packagePath, network),
      ]);

      return {
        id: info.ids[0],
        collectionIds: info.ids,
        packagePath,
        name: info.name,
        symbol: info.symbol,
        ownedCount: info.count,
        thumbnailNftId,
        ...capabilities,
      };
    }));
  }

  // Walks the collection's ids in order; the returned cursor is opaque to callers.
  async getItems(address: string, collection: NftCollection, network: Network, cursor?: string | null): Promise<Page<NftItem>> {
    if (!network.apiUrl) {
      return { items: [], cursor: null, hasNext: false };
    }

    const ids = collection.collectionIds?.length ? collection.collectionIds : [collection.id];
    let position = decodeCursor(cursor);
    const items: NftItem[] = [];

    for (let pages = 0; pages < MAX_PAGES_PER_CALL && position.index < ids.length; pages++) {
      const { items: page, page: info } = await this.api.getCollectionItems(network.apiUrl, address, ids[position.index], position.cursor);

      items.push(...page.filter(item => item.isOwned !== false).map(item => ({
        collectionId: collection.id,
        packagePath: item.packagePath || collection.packagePath,
        nftId: item.nftId,
        name: item.name || collection.name,
        symbol: item.symbol || collection.symbol,
      })));
      position = info.hasNext && info.cursor ? { index: position.index, cursor: info.cursor } : { index: position.index + 1, cursor: null };

      if (items.length > 0) {
        break;
      }
    }

    const hasNext = position.index < ids.length;

    return { items, cursor: hasNext ? encodeCursor(position.index, position.cursor) : null, hasNext };
  }

  async getTokenUri(packagePath: string, nftId: string, network: Network): Promise<string | null> {
    const provider = await this.providerFactory(network.rpcUrl);
    const raw = await evaluateOrEmpty(() => provider.evaluateExpression(packagePath, `TokenURI(${gnoLiteral(nftId)})`));

    return raw ? readStringResult(raw) : null;
  }

  async getMetadata(packagePath: string, nftId: string, network: Network): Promise<NftMetadata | null> {
    const provider = await this.providerFactory(network.rpcUrl);
    const raw = await evaluateOrEmpty(() => provider.evaluateExpression(packagePath, `TokenMetadata(${gnoLiteral(nftId)})`));
    const text = raw ? readStringResult(raw) : null;

    if (!text) {
      return null;
    }

    try {
      return toMetadata(JSON.parse(text));
    }
    catch {
      return null;
    }
  }

  // Same call as the extension: TransferFrom(from, to, tid) on the collection realm.
  buildTransferMessages({ fromAddress, toAddress, packagePath, nftId }: NftTransferParams): GnoMessage[] {
    return [{
      type: GnoMessageType.VM_CALL,
      value: { caller: fromAddress, send: '', max_deposit: '', pkg_path: packagePath, func: 'TransferFrom', args: [fromAddress, toAddress, nftId] },
    }];
  }

  // First owned token within a few pages, skipping staked tokens the account only operates.
  // When none is found the first token seen is used for display only.
  private async findThumbnail(apiUrl: string, address: string, ids: string[]): Promise<string | undefined> {
    let fallback: string | undefined;
    let index = 0;
    let cursor: string | null = null;

    for (let pages = 0; pages < THUMBNAIL_MAX_PAGES && index < ids.length; pages++) {
      const { items, page } = await this.api.getCollectionItems(apiUrl, address, ids[index], cursor, THUMBNAIL_PAGE_SIZE);
      const owned = items.find(item => item.isOwned !== false);

      if (owned) {
        return owned.nftId;
      }

      fallback ??= items[0]?.nftId;
      [index, cursor] = page.hasNext && page.cursor ? [index, page.cursor] : [index + 1, null];
    }

    return fallback;
  }

  // Detection failures keep both capabilities on, so images still get a best-effort attempt.
  private async getCapabilities(packagePath: string, network: Network): Promise<{ supportsTokenUri: boolean; supportsMetadata: boolean }> {
    try {
      const provider = await this.providerFactory(network.rpcUrl);
      const signatures = await provider.getFunctionSignatures(packagePath);
      const returnsString = (name: string): boolean =>
        signatures.some(signature => signature.FuncName === name && signature.Results?.[0]?.Type === 'string');

      return { supportsTokenUri: returnsString('TokenURI'), supportsMetadata: returnsString('TokenMetadata') };
    }
    catch {
      return { supportsTokenUri: true, supportsMetadata: true };
    }
  }
}
