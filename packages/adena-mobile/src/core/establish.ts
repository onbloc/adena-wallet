import type {BaseServices} from './services';

export interface EstablishedSite {
  hostname: string;
  accountId: string;
  appName: string;
  favicon: string | null;
}

/** The `chainIds` of an ADD_ESTABLISH request, as the extension reads it. */
export function normalizeChainIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );
  }
  return [];
}

/**
 * Connects `site` on every requested chain, or on `currentChainId` when the
 * request names none, after the extension's approve-establish page: AtomOne
 * chains go to the AtomOne service (Cosmos methods check it), the rest to the
 * Gno one, and a failure undoes the entries already saved.
 */
export async function establishSite(
  base: Pick<
    BaseServices,
    'chainRegistry' | 'establishService' | 'establishAtomOneService'
  >,
  site: EstablishedSite,
  chainIds: string[],
  currentChainId: string,
): Promise<void> {
  const serviceFor = (chainId: string) =>
    base.chainRegistry.getChainByChainId(chainId)?.chainGroup === 'atomone'
      ? base.establishAtomOneService
      : base.establishService;
  const targets = chainIds.length > 0 ? chainIds : [currentChainId];
  const persisted: string[] = [];
  try {
    for (const chainId of targets) {
      await serviceFor(chainId).establishBy(site.accountId, chainId, site);
      persisted.push(chainId);
    }
  } catch (error) {
    await Promise.allSettled(
      persisted
        .reverse()
        .map(chainId =>
          serviceFor(chainId).unEstablishBy(
            site.accountId,
            site.hostname,
            chainId,
          ),
        ),
    );
    throw error;
  }
}
