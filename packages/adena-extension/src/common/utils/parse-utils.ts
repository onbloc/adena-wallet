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

function checkImport(code: string, importPath: string): boolean {
  const importRegex = /import\s*\(([^)]+)\)/m;
  const match = code.match(importRegex);
  if (!match) return false;

  const imports = match[1].split('\n').map((line) =>
    line
      .trim()
      .replace(/"/g, '')
      .replace(/^[a-zA-Z_][a-zA-Z0-9_]*\s+/, ''),
  );
  return imports.includes(importPath);
}

interface MethodSignature {
  [methodName: string]: string;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMethods(code: string, typeName: string): MethodSignature {
  const escapedTypeName = escapeRegExp(typeName);
  const methodRegex = new RegExp(
    // eslint-disable-next-line no-useless-escape
    `func\\s+${escapedTypeName}\\.([a-zA-Z0-9_]+)\\s*\$begin:math:text$([^)]*)\\$end:math:text$\\s*([^{}]+)\\{`,
    'g',
  );

  let match: RegExpExecArray | null;
  const methods: MethodSignature = {};

  while ((match = methodRegex.exec(code)) !== null) {
    const methodName = match[1];
    const params = match[2].trim();
    const returns = match[3].trim().replace(/\s+/g, ' ');
    methods[methodName] = `${methodName}(${params}) ${returns}`;
  }

  return methods;
}

interface InterfaceCheckResult {
  implementsInterface: boolean;
  missingMethods: string[];
}

function checkInterfaceImplementation(
  code: string,
  typeName: string,
  interfaceDef: { [key: string]: string },
): InterfaceCheckResult {
  const methods = extractMethods(code, typeName);
  const missingMethods: string[] = [];

  for (const methodName in interfaceDef) {
    if (!(methodName in methods)) {
      missingMethods.push(methodName);
    }
  }

  return {
    implementsInterface: missingMethods.length === 0,
    missingMethods,
  };
}

interface GRC721Meta {
  variableName: string;
  name: string;
  symbol: string;
}

function parseGRC721NewFunctions(code: string): GRC721Meta | null {
  const grcNewRegex =
    /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*grc721\.New\w+\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = grcNewRegex.exec(code)) !== null) {
    if (match.length < 3) {
      continue;
    }

    const variableName = match[1];
    const name = match[2];
    const symbol = match[3];

    return {
      variableName,
      name,
      symbol,
    };
  }

  return null;
}

export function parseGRC721FileContents(contents: string): GRC721Meta | null {
  const importPath = 'gno.land/p/demo/grc/grc721';
  const hasImport = checkImport(contents, importPath);
  if (!hasImport) {
    return null;
  }

  const grc721Meta = parseGRC721NewFunctions(contents);
  if (!grc721Meta) {
    return null;
  }

  const interfaceCheck = checkInterfaceImplementation(contents, grc721Meta.variableName, {
    BalanceOf: 'BalanceOf(owner std.Address) (uint64, error)',
    OwnerOf: 'OwnerOf(tid TokenID) (std.Address, error)',
    SetTokenURI: 'SetTokenURI(tid TokenID, tURI TokenURI) (bool, error)',
    SafeTransferFrom: 'SafeTransferFrom(from, to std.Address, tid TokenID) error',
    TransferFrom: 'TransferFrom(from, to std.Address, tid TokenID) error',
    Approve: 'Approve(approved std.Address, tid TokenID) error',
    SetApprovalForAll: 'SetApprovalForAll(operator std.Address, approved bool) error',
    GetApproved: 'GetApproved(tid TokenID) (std.Address, error)',
    IsApprovedForAll: 'IsApprovedForAll(owner, operator std.Address) bool',
  });
  if (!interfaceCheck.implementsInterface) {
    return null;
  }

  return grc721Meta;
}
