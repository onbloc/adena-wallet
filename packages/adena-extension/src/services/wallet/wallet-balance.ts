import BigNumber from 'bignumber.js';

import { GnoProvider } from '@common/provider/gno/gno-provider';
import { decodeQEvalInt, gnoLiteral, parseQEvalResult } from '@common/provider/gno/qeval';
import { parseTokenPath, toRegistryKey } from '@common/utils/grc20-token-path';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { TokenBalanceType, TokenModel } from '@types';

// Max token balances per batched grc20reg qeval. Keeps one request's return
// tuple and source expression within a comfortable size.
const GRC20_BALANCE_BATCH_SIZE = 50;

export class WalletBalanceService {
  private tokenMetainfos: TokenModel[];

  private gnoProvider: GnoProvider | null = null;

  // grc20reg realm used to resolve GRC20 token objects for balance queries.
  // Empty string falls back to calling BalanceOf on the token realm directly.
  private registryPath = '';

  constructor(gnoProvider?: GnoProvider | null) {
    this.tokenMetainfos = [];
    this.gnoProvider = gnoProvider || null;
  }

  public setRegistryPath(registryPath: string): void {
    this.registryPath = registryPath || '';
  }

  public getGnoProvider(): GnoProvider {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }
    return this.gnoProvider;
  }

  public setGnoProvider(gnoProvider: GnoProvider): void {
    this.gnoProvider = gnoProvider;
  }

  public setTokenMetainfos(tokenMetainfos: Array<TokenModel>): void {
    this.tokenMetainfos = tokenMetainfos;
  }

  public async getGnotTokenBalance(address: string): Promise<number | null> {
    const gnoProvider = this.getGnoProvider();
    return gnoProvider
      .getBalance(address, GNOT_TOKEN.denom)
      .then((result) => {
        if (BigNumber(result).isInteger()) {
          return BigNumber(result)
            .shiftedBy(GNOT_TOKEN.decimals * -1)
            .toNumber();
        }
        return null;
      })
      .catch(() => null);
  }

  /**
   * GRC20 balance of `address` for a token key (`{packagePath}.{symbol}`),
   * shifted by decimals. Resolves the token through the grc20reg registry
   * (`Get(registryKey).BalanceOf(address)`); a nil token yields 0.
   */
  public async getGRC20TokenBalance(
    address: string,
    tokenPath: string,
    decimals = 6,
  ): Promise<number | null> {
    const raw = await this.getGRC20RawBalance(address, tokenPath).catch(() => null);
    if (raw === null) {
      return null;
    }
    return BigNumber(raw.toString())
      .shiftedBy(decimals * -1)
      .toNumber();
  }

  /**
   * Raw (undecimalized) GRC20 balance as a bigint. Prefers the grc20reg
   * registry object receiver; falls back to calling BalanceOf on the token
   * realm directly when no registry path is configured or the token path has no
   * symbol (legacy pkgPath-only input).
   */
  private async getGRC20RawBalance(address: string, tokenPath: string): Promise<bigint | null> {
    const gnoProvider = this.getGnoProvider();
    const registryKey = toRegistryKey(tokenPath);

    if (this.registryPath && registryKey) {
      try {
        const response = await gnoProvider.evaluateIIFE(this.registryPath, {
          returnType: 'int64',
          statements: [
            `token := Get(${gnoLiteral(registryKey)})`,
            'if token == nil { return 0 }',
          ],
          returnExpression: `token.BalanceOf(${gnoLiteral(address)})`,
        });
        return decodeQEvalInt(response);
      } catch {
        // Fall through to the direct-realm path below.
      }
    }

    const packagePath = parseTokenPath(tokenPath)?.packagePath ?? tokenPath;
    const result = await gnoProvider
      .getValueByEvaluateExpression(packagePath, 'BalanceOf', [address])
      .catch(() => null);
    if (result === null || !BigNumber(result).isInteger()) {
      return null;
    }
    return BigInt(result);
  }

  /**
   * Batch GRC20 balances for many token paths in as few qeval calls as
   * possible: one `grc20reg` IIFE per chunk that returns an int64 per token
   * (`Get(key).BalanceOf(addr)`, nil → 0). Returns raw (undecimalized) balances
   * keyed by token path; callers apply each token's decimals. Used by the
   * wallet-main balance load to cut per-token round-trips. Falls back to
   * per-token queries when no registry path is configured.
   */
  public async getGRC20TokenBalanceMap(
    address: string,
    tokenPaths: string[],
  ): Promise<Record<string, bigint>> {
    const gnoProvider = this.getGnoProvider();
    const result: Record<string, bigint> = {};

    const batchable = tokenPaths.filter((tokenPath) => toRegistryKey(tokenPath) !== null);
    if (!this.registryPath || batchable.length === 0) {
      for (const tokenPath of tokenPaths) {
        const raw = await this.getGRC20RawBalance(address, tokenPath).catch(() => null);
        if (raw !== null) {
          result[tokenPath] = raw;
        }
      }
      return result;
    }

    for (let start = 0; start < batchable.length; start += GRC20_BALANCE_BATCH_SIZE) {
      const chunk = batchable.slice(start, start + GRC20_BALANCE_BATCH_SIZE);

      const statements: string[] = [];
      const returnParts: string[] = [];
      const returnTypes: string[] = [];
      chunk.forEach((tokenPath, i) => {
        const key = toRegistryKey(tokenPath) as string;
        statements.push(`v${i} := int64(0)`);
        statements.push(
          `{ t := Get(${gnoLiteral(key)}); if t != nil { v${i} = t.BalanceOf(${gnoLiteral(address)}) } }`,
        );
        returnParts.push(`v${i}`);
        returnTypes.push('int64');
      });

      try {
        const response = await gnoProvider.evaluateIIFE(this.registryPath, {
          returnType: `(${returnTypes.join(', ')})`,
          statements,
          returnExpression: returnParts.join(', '),
        });
        const tuples = parseQEvalResult(response);
        chunk.forEach((tokenPath, i) => {
          const tuple = tuples[i];
          if (tuple && /^-?\d+$/.test(tuple.value)) {
            result[tokenPath] = BigInt(tuple.value);
          }
        });
      } catch {
        // Batch failed — fall back to per-token for this chunk.
        for (const tokenPath of chunk) {
          const raw = await this.getGRC20RawBalance(address, tokenPath).catch(() => null);
          if (raw !== null) {
            result[tokenPath] = raw;
          }
        }
      }
    }

    return result;
  }

  public getTokenBalances = async (address: string): Promise<TokenBalanceType[]> => {
    const gnoProvider = this.getGnoProvider();
    const denom = GNOT_TOKEN.denom;
    const balance = await gnoProvider
      .getBalance(address, denom)
      .then((value) => ({
        value: value.toFixed(),
        denom,
      }))
      .catch(() => ({
        value: '0',
        denom,
      }));
    const tokenBalances: Array<TokenBalanceType> = [];

    for (const tokenMetainfo of this.tokenMetainfos) {
      const isNativeToken = isNativeTokenModel(tokenMetainfo);
      if (
        balance.denom.toUpperCase() === tokenMetainfo.symbol.toUpperCase() ||
        (isNativeToken && balance.denom.toUpperCase() === tokenMetainfo.denom.toUpperCase())
      ) {
        tokenBalances.push(this.createTokenBalance(balance, tokenMetainfo));
      }
    }
    return tokenBalances;
  };

  public getGRC20TokenBalances = async (
    address: string,
    packagePath: string,
    symbol: string,
  ): Promise<TokenBalanceType[]> => {
    const gnoProvider = this.getGnoProvider();
    const balance = await gnoProvider.getValueByEvaluateExpression(packagePath, 'BalanceOf', [
      address,
    ]);
    if (!balance) {
      return [];
    }
    const balanceAmount = {
      value: balance,
      denom: symbol.toUpperCase(),
    };
    const tokenBalance = this.tokenMetainfos.find(
      (tokenMetainfo) => isGRC20TokenModel(tokenMetainfo) && tokenMetainfo.pkgPath === packagePath,
    );
    if (tokenBalance) {
      return [this.createTokenBalance(balanceAmount, tokenBalance)];
    }
    return [];
  };

  public convertDenom = (
    value: string,
    denom: string,
    tokenMetainfo: TokenModel,
    convertType: 'COMMON' | 'MINIMAL' = 'COMMON',
  ): {
    value: string;
    denom: string;
  } => {
    const decimals = tokenMetainfo.decimals;
    let shift = 0;
    let convertedDenom = tokenMetainfo.symbol;
    if (convertType === 'COMMON') {
      if (tokenMetainfo.symbol.toUpperCase() !== denom.toUpperCase()) {
        shift = decimals * -1;
      }
    }

    if (convertType === 'MINIMAL') {
      convertedDenom = isNativeTokenModel(tokenMetainfo)
        ? tokenMetainfo.denom
        : tokenMetainfo.symbol;
      if (convertedDenom.toUpperCase() !== denom.toUpperCase()) {
        shift = decimals;
      }
    }

    return {
      value: new BigNumber(value).shiftedBy(shift).toString(),
      denom: convertedDenom,
    };
  };

  private createTokenBalance = (
    balance: {
      value: string;
      denom: string;
    },
    tokenMetainfo: TokenModel,
  ): TokenBalanceType => {
    const { value, denom } = this.convertDenom(
      balance.value,
      balance.denom,
      tokenMetainfo,
      'COMMON',
    );
    return {
      ...tokenMetainfo,
      amount: {
        value,
        denom,
      },
    };
  };
}
