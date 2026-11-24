import { ChainFamily, Network } from '../../../domain/network';
import { Token, TokenType } from '../../../domain/token';
import { getGrc20RegistryConfig } from '../../../resources';
import { GnoProviderFactory } from './gno-provider';
import { buildIife, decodeGoString, gnoLiteral, parseQEvalResult } from './gno-qeval';
import { parseRegistryKey } from './gno-token-key';

const BATCH_SIZE = 50;

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

// On-chain grc20reg queries (listing, metadata, balances), all through vm/qeval.
export class GnoGrc20Registry {
  constructor(private readonly providerFactory: GnoProviderFactory) {}

  private registryPath(network: Network): string {
    return getGrc20RegistryConfig(network.chainId).registries[0].path;
  }

  private async evaluate(network: Network, expression: string): Promise<string> {
    const provider = await this.providerFactory(network.rpcUrl);

    return provider.evaluateExpression(this.registryPath(network), expression);
  }

  async listKeys(network: Network, offset: number, limit: number): Promise<{ keys: string[]; total: number }> {
    const expression = buildIife(
      '(int, string)',
      ['reg := GetRegistry()', 's := ""', `reg.IterateByOffset(${offset}, ${limit}, func(key string, value any) bool { s += key + ","; return false })`],
      'reg.Size(), s',
    );
    const [total, keys] = parseQEvalResult(await this.evaluate(network, expression));

    return {
      total: Number(total?.value ?? 0),
      keys: decodeGoString(keys?.value ?? '""').split(',').filter(Boolean),
    };
  }

  async getTokens(network: Network, keys: string[]): Promise<Token[]> {
    const tokens: Token[] = [];

    for (const batch of chunk(keys.filter(key => parseRegistryKey(key)), BATCH_SIZE)) {
      const statements = batch.flatMap((key, index) => [
        `n${index} := ""`,
        `s${index} := ""`,
        `d${index} := 0`,
        `{ t := Get(${gnoLiteral(key)}); if t != nil { n${index} = t.GetName(); s${index} = t.GetSymbol(); d${index} = t.GetDecimals() } }`,
      ]);
      const returnType = `(${batch.map(() => 'string, string, int').join(', ')})`;
      const returns = batch.map((_, index) => `n${index}, s${index}, d${index}`).join(', ');
      const tuples = parseQEvalResult(await this.evaluate(network, buildIife(returnType, statements, returns)));

      batch.forEach((key, index) => {
        const name = decodeGoString(tuples[index * 3]?.value ?? '""');
        const symbol = decodeGoString(tuples[index * 3 + 1]?.value ?? '""');
        const decimals = Number(tuples[index * 3 + 2]?.value ?? 0);
        const parsed = parseRegistryKey(key);

        if (!name || !symbol || !parsed) {
          return;
        }

        tokens.push({
          id: key,
          networkId: network.id,
          family: ChainFamily.GNO,
          type: TokenType.GRC20,
          name,
          symbol,
          decimals,
          pkgPath: parsed.pkgPath,
          isNative: false,
        });
      });
    }

    return tokens;
  }

  async getBalances(network: Network, address: string, keys: string[]): Promise<Record<string, string>> {
    const balances: Record<string, string> = {};

    for (const batch of chunk(keys, BATCH_SIZE)) {
      const statements = batch.flatMap((key, index) => [
        `f${index} := false`,
        `v${index} := int64(0)`,
        `{ t := Get(${gnoLiteral(key)}); if t != nil { f${index} = true; v${index} = t.BalanceOf(${gnoLiteral(address)}) } }`,
      ]);
      const returnType = `(${batch.map(() => 'bool, int64').join(', ')})`;
      const returns = batch.map((_, index) => `f${index}, v${index}`).join(', ');
      const tuples = parseQEvalResult(await this.evaluate(network, buildIife(returnType, statements, returns)));

      batch.forEach((key, index) => {
        if (tuples[index * 2]?.value === 'true') {
          balances[key] = tuples[index * 2 + 1]?.value ?? '0';
        }
      });
    }

    return balances;
  }
}
