import { TokenProfile, TokenRegistry } from './types';

export class TokenRegistryImpl implements TokenRegistry {
  private tokens: Map<string, TokenProfile> = new Map();

  register(token: TokenProfile): void {
    this.tokens.set(token.id, token);
  }

  get(id: string): TokenProfile | undefined {
    return this.tokens.get(id);
  }

  list(chainProfileId?: string): TokenProfile[] {
    const all = Array.from(this.tokens.values());
    if (chainProfileId === undefined) {
      return all;
    }
    return all.filter((token) => token.chainProfileId === chainProfileId);
  }
}
