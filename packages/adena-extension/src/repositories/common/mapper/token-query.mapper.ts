import { parseGRC721FileContents } from '@common/utils/parse-utils';
import { GRC20RegisterEvent, GRC721CollectionModel } from '@types';

export const GRC20_FUNCTIONS = [
  'TotalSupply',
  'BalanceOf',
  'Transfer',
  'Allowance',
  'Approve',
  'TransferFrom',
];

/** Must stay in sync with `makeGetGRC20RegisterEventsQuery` indexer filter. */
const GRC20_REGISTER_EVENT_TYPE = 'register';
const GRC20_REGISTER_REGISTRY_PKG_PATH = 'gno.land/r/demo/defi/grc20reg';

type GnoEventAttr = { key: string; value: string };

type GnoGraphQueryEvent = {
  type?: string;
  pkg_path?: string;
  attrs?: GnoEventAttr[];
};

export type GRC20RegisterTransactionsQueryResult = {
  data?: {
    getTransactions?: Array<{
      response?: { events?: unknown[] };
    }>;
  };
};

function isGnoGraphQueryEvent(ev: unknown): ev is GnoGraphQueryEvent {
  return (
    typeof ev === 'object' &&
    ev !== null &&
    'type' in ev &&
    typeof (ev as GnoGraphQueryEvent).type === 'string' &&
    'pkg_path' in ev &&
    typeof (ev as GnoGraphQueryEvent).pkg_path === 'string'
  );
}

function parseGRC20RegisterAttrs(attrs: GnoEventAttr[] | undefined): GRC20RegisterEvent | null {
  if (!attrs?.length) {
    return null;
  }
  const byKey: Record<string, string> = {};
  for (const { key, value } of attrs) {
    byKey[key.toLowerCase()] = value;
  }
  const packagePath = byKey.pkgpath;
  if (!packagePath) {
    return null;
  }
  return {
    packagePath,
    slug: byKey.slug ?? '',
  };
}

/**
 * Maps `getGRC20RegisterEvents` GraphQL response: one {@link GRC20RegisterEvent}
 * per matching Gno event (`register` on grc20reg), derived from event attrs.
 */
export function mapGRC20RegisterEvent(
  queryResult: GRC20RegisterTransactionsQueryResult | null | undefined,
): GRC20RegisterEvent[] {
  const transactions = queryResult?.data?.getTransactions;
  if (!transactions?.length) {
    return [];
  }

  const events: GRC20RegisterEvent[] = [];
  for (const tx of transactions) {
    const rawEvents = tx?.response?.events;
    if (!rawEvents?.length) {
      continue;
    }
    for (const ev of rawEvents) {
      if (!isGnoGraphQueryEvent(ev)) {
        continue;
      }
      if (
        ev.type !== GRC20_REGISTER_EVENT_TYPE ||
        ev.pkg_path !== GRC20_REGISTER_REGISTRY_PKG_PATH
      ) {
        continue;
      }
      const mapped = parseGRC20RegisterAttrs(ev.attrs);
      if (mapped) {
        events.push(mapped);
      }
    }
  }
  return events;
}

export function mapGRC721CollectionModel(
  networkId: string,
  message: any,
): GRC721CollectionModel | null {
  const packageInfo = message?.value?.package;
  if (!packageInfo) {
    return null;
  }
  const packagePath = packageInfo.path;

  for (const file of packageInfo.files) {
    const tokenInfo = parseGRC721FileContents(file.body);
    if (tokenInfo) {
      return {
        tokenId: packagePath,
        networkId: networkId,
        display: false,
        type: 'grc721',
        packagePath,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        image: null,
        isMetadata: tokenInfo.isMetadata,
        isTokenUri: tokenInfo.isTokenUri,
      };
    }
  }

  return null;
}
