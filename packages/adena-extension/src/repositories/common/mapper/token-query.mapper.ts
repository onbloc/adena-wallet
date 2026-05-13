import { parseGRC721FileContents } from '@common/utils/parse-utils';
import { GRC20RegisterEvent, GRC20TokenModel, GRC721CollectionModel } from '@types';

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

export function mapGRC20TokenModel(networkId: string, message: any): GRC20TokenModel | null {
  const packageInfo = message?.value?.package;
  if (!packageInfo) {
    return null;
  }
  const packagePath = packageInfo.path;

  for (const file of packageInfo.files) {
    const tokenInfo = parseGRC20InfoByFile(file.body) || parseBankerGRC20InfoByFile(file.body);
    if (tokenInfo) {
      return {
        main: false,
        tokenId: packagePath,
        pkgPath: packagePath,
        networkId,
        display: false,
        type: 'grc20',
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        image: '',
      };
    }
  }

  return null;
}

function parseGRC20InfoByFile(
  file: string,
): {
  name: string;
  symbol: string;
  decimals: number;
  owner: string;
} | null {
  const constructRegexp = /\((.*)\)/;
  const constructFunctionName = '.NewAdminToken';
  const functionRegexp = /([a-zA-Z0-9])+/;
  const adminRegexp = /(\w+)\s+std\.Address\s*=\s*"([^"]*)"/;

  let grc20Info: {
    name: string;
    symbol: string;
    decimals: number;
    owner: string;
  } | null = null;
  let owner: string | null = '';
  const functions: string[] = [];

  for (const line of file.split('\n')) {
    const trimLine = line.replace(/\\t/g, '').trim();

    if (!owner) {
      const adminParams = trimLine.match(adminRegexp);
      if (adminParams && adminParams.length > 2) {
        owner = adminParams[2];
      }
    }

    if (!grc20Info && trimLine.includes(constructFunctionName)) {
      const exec = constructRegexp.exec(trimLine);
      if (exec && exec.length > 1) {
        const paramStr = exec[1].replace(/"/gi, '');
        const params = paramStr.split(',').map((param) => param.trim());

        if (params.length > 2) {
          grc20Info = {
            name: params[0],
            symbol: params[1],
            decimals: Number(params[2]),
            owner: '',
          };
        }
      }
    }

    if (trimLine.startsWith('func')) {
      const results = trimLine.replace('func', '').match(functionRegexp);
      const functionName = results?.[0];
      if (functionName) {
        functions.push(functionName);
      }
    }
  }

  if (!grc20Info || !owner) {
    return null;
  }

  if (!GRC20_FUNCTIONS.every((func) => functions.includes(func))) {
    return null;
  }
  return { ...grc20Info, owner };
}

function parseBankerGRC20InfoByFile(
  file: string,
): {
  name: string;
  symbol: string;
  decimals: number;
  owner: string;
} | null {
  const addressPattern = /ownable\.NewWithAddress\("([a-z0-9]+)"\)/;
  const bankerPattern = /grc20\.NewBanker\("([^"]+)",\s*"([^"]+)",\s*(\d+)\)/;

  try {
    const addressMatch = file.match(addressPattern);
    const address = addressMatch ? addressMatch[1] : null;

    const bankerMatch = file.match(bankerPattern);
    const bankerInfo = bankerMatch
      ? {
          name: bankerMatch[1],
          symbol: bankerMatch[2],
          decimals: parseInt(bankerMatch[3], 10),
        }
      : null;

    if (!bankerInfo || !address) {
      return null;
    }

    return {
      name: bankerInfo.name,
      symbol: bankerInfo.symbol,
      decimals: bankerInfo.decimals,
      owner: address,
    };
  } catch {
    return null;
  }
}
