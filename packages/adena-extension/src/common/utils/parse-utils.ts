export const parseGRC20ByABCIRender = (
  response: string,
): {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  totalSupply: bigint;
  knownAccounts: bigint;
} => {
  if (!response) {
    throw new Error('failed parse grc20 token render');
  }

  const regex =
    /#\s(?<tokenName>.+)\s\(\$(?<tokenSymbol>.+)\)\s*\* \*\*Decimals\*\*: (?<tokenDecimals>\d+)\s*\* \*\*Total supply\*\*: (?<totalSupply>\d+)\s*\* \*\*Known accounts\*\*: (?<knownAccounts>\d+)/;

  const match = response.match(regex);

  if (!match || !match?.groups) {
    throw new Error('failed parse grc20 token render');
  }

  return {
    tokenName: match.groups.tokenName,
    tokenSymbol: match.groups.tokenSymbol,
    tokenDecimals: parseInt(match.groups.tokenDecimals, 10),
    totalSupply: BigInt(match.groups.totalSupply),
    knownAccounts: BigInt(match.groups.knownAccounts),
  };
};

/**
 * realm's path format: {Domain}/{Type}/{Namespace}/{Remain Path...}
 */
export const parseReamPathItemsByPath = (
  realmPath: string,
): {
  domain: string;
  type: string;
  namespace: string;
  remainPath: string;
} => {
  const pathItems = realmPath.split('/');
  if (pathItems.length < 4) {
    throw new Error('not available realm path, path size less than 4');
  }

  const [domain, type, namespace, ...remainPathItems] = pathItems;

  const availableDomains = ['gno.land'];
  if (!availableDomains.includes(domain)) {
    throw new Error('not available realm path, domain is ' + domain);
  }

  const availableTypes = ['p', 'r'];
  if (!availableTypes.includes(type)) {
    throw new Error('not available realm path, type is ' + type);
  }

  return {
    domain,
    type,
    namespace,
    remainPath: remainPathItems.join('/'),
  };
};

export const parseGRC20ByFileContents = (
  contents: string,
): {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
} | null => {
  const newBankerRegex = /grc20\.NewBanker\(([^)]+)\)/;
  const match = contents.match(newBankerRegex);
  const matchLine = match?.[1] || null;

  if (!matchLine) {
    return null;
  }

  const args = matchLine.split(',').map((arg) => arg.trim());
  if (args.length < 3) {
    return null;
  }

  const tokenName = args[0].startsWith('"') ? args[0].slice(1, -1) : args[0];
  const tokenSymbol = args[1].startsWith('"') ? args[1].slice(1, -1) : args[1];
  const tokenDecimals = isNaN(Number(args[2])) ? 0 : Number(args[2]);

  return {
    tokenName,
    tokenSymbol,
    tokenDecimals,
  };
};
