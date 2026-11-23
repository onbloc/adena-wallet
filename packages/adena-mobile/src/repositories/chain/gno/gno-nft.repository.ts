import { ChainFamily, Network } from '../../../domain/network';
import { NftCollection, NftItem, NftMetadata, Page } from '../../../domain/nft';
import { OnblocApiClient } from '../../../infrastructure/http/onbloc-api.client';
import { NftRepository, NftTransferParams } from '../nft-repository';
import { GnoMessage, GnoMessageType } from './gno-messages';
import { GnoProviderFactory } from './gno-provider';
import { decodeGoString, gnoLiteral, parseQEvalResult } from './gno-qeval';

const MAX_URI_LENGTH = 2 * 1024 * 1024;

// A trailing error tuple other than a nil `(undefined)` means the call failed.
const readStringResult = (raw: string): string | null => {
  const [value, error] = parseQEvalResult(raw);

  if (!value || (error && error.value !== 'undefined')) {
    return null;
  }

  const decoded = decodeGoString(value.value);

  return decoded && decoded.length <= MAX_URI_LENGTH ? decoded : null;
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
  async getCollections(address: string, network: Network): Promise<NftCollection[]> {
    if (!network.apiUrl) {
      return [];
    }

    const apiUrl = network.apiUrl;
    const owned = (await this.api.getAccountCollections(apiUrl, address)).filter(item => item.tokenCount > 0);
    const byPackage = new Map<string, { id: string; name: string; symbol: string; count: number }>();

    owned.forEach((item) => {
      const current = byPackage.get(item.packagePath);

      byPackage.set(item.packagePath, {
        id: current?.id ?? (item.tokenId || item.packagePath),
        name: current?.name ?? item.name,
        symbol: current?.symbol ?? item.symbol,
        count: (current?.count ?? 0) + item.tokenCount,
      });
    });

    return Promise.all([...byPackage.entries()].map(async ([packagePath, info]) => {
      const [thumbnail, capabilities] = await Promise.all([
        this.api.getCollectionItems(apiUrl, address, info.id, null, 1).catch(() => null),
        this.getCapabilities(packagePath, network),
      ]);

      return {
        id: info.id,
        packagePath,
        name: info.name,
        symbol: info.symbol,
        ownedCount: info.count,
        thumbnailNftId: thumbnail?.items[0]?.nftId,
        ...capabilities,
      };
    }));
  }

  async getItems(address: string, collection: NftCollection, network: Network, cursor?: string | null): Promise<Page<NftItem>> {
    if (!network.apiUrl) {
      return { items: [], cursor: null, hasNext: false };
    }

    const { items, page } = await this.api.getCollectionItems(network.apiUrl, address, collection.id, cursor);

    return {
      items: items.map(item => ({
        collectionId: collection.id,
        packagePath: item.packagePath || collection.packagePath,
        nftId: item.nftId,
        name: item.name || collection.name,
        symbol: item.symbol || collection.symbol,
      })),
      cursor: page.cursor ?? null,
      hasNext: page.hasNext,
    };
  }

  async getTokenUri(packagePath: string, nftId: string, network: Network): Promise<string | null> {
    const provider = await this.providerFactory(network.rpcUrl);
    const raw = await provider.evaluateExpression(packagePath, `TokenURI(${gnoLiteral(nftId)})`).catch(() => '');

    return raw ? readStringResult(raw) : null;
  }

  async getMetadata(packagePath: string, nftId: string, network: Network): Promise<NftMetadata | null> {
    const provider = await this.providerFactory(network.rpcUrl);
    const raw = await provider.evaluateExpression(packagePath, `TokenMetadata(${gnoLiteral(nftId)})`).catch(() => '');
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
