export const parseGRC20ByABCIRender = (
  response: string,
): {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  totalSupply: bigint;
  knownAccounts: bigint;
} => {
  const regex =
    /#\s(?<tokenName>.+)\s\(\$(?<tokenSymbol>.+)\)\s*\* \*\*Decimals\*\*: (?<tokenDecimals>\d+)\s*\* \*\*Total supply\*\*: (?<totalSupply>\d+)\s*\* \*\*Known accounts\*\*: (?<knownAccounts>\d+)/;

  const match = response.match(regex);

  if (!match || !match.groups) {
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
