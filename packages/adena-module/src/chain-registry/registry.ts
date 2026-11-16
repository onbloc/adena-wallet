import { Chain, ChainRegistry, NetworkProfile } from './types';

export class ChainRegistryImpl implements ChainRegistry {
  private chains: Map<string, Chain> = new Map();
  private profiles: Map<string, NetworkProfile> = new Map();

  // ── Chain API ──────────────────────────────────────────────────────

  registerChain(chain: Chain): void {
    this.chains.set(chain.chainGroup, chain);
  }

  getChain(chainGroup: string): Chain | undefined {
    return this.chains.get(chainGroup);
  }

  listChains(): Chain[] {
    return Array.from(this.chains.values());
  }

  // ── NetworkProfile API ─────────────────────────────────────────────

  registerNetworkProfile(profile: NetworkProfile): void {
    this.profiles.set(profile.id, profile);
  }

  getNetworkProfile(id: string): NetworkProfile | undefined {
    return this.profiles.get(id);
  }

  getNetworkProfileByChainId(chainId: string): NetworkProfile | undefined {
    return Array.from(this.profiles.values()).find((p) => p.chainId === chainId);
  }

  getChainByChainId(chainId: string): Chain | undefined {
    const profile = this.getNetworkProfileByChainId(chainId);
    if (!profile) return undefined;
    return this.getChain(profile.chainGroup);
  }

  listNetworkProfilesByChain(chainGroup: string): NetworkProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.chainGroup === chainGroup);
  }

  getDefaultNetworkProfile(chainGroup: string): NetworkProfile | undefined {
    const group = this.listNetworkProfilesByChain(chainGroup);
    return group.find((p) => p.isMainnet) ?? group[0];
  }

  // ── Backward-compatible API ────────────────────────────────────────

  register(profile: NetworkProfile): void {
    this.registerNetworkProfile(profile);
  }

  get(id: string): NetworkProfile | undefined {
    return this.getNetworkProfile(id);
  }

  list(): NetworkProfile[] {
    return Array.from(this.profiles.values());
  }

  listByGroup(chainGroup: string): NetworkProfile[] {
    return this.listNetworkProfilesByChain(chainGroup);
  }

  getDefault(chainGroup: string): NetworkProfile | undefined {
    return this.getDefaultNetworkProfile(chainGroup);
  }
}
