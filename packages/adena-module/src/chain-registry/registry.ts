import { ChainProfile, ChainRegistry } from './types';

export class ChainRegistryImpl implements ChainRegistry {
  private profiles: Map<string, ChainProfile> = new Map();

  register(profile: ChainProfile): void {
    this.profiles.set(profile.id, profile);
  }

  get(id: string): ChainProfile | undefined {
    return this.profiles.get(id);
  }

  list(): ChainProfile[] {
    return Array.from(this.profiles.values());
  }

  listByGroup(chainGroup: string): ChainProfile[] {
    return this.list().filter((p) => p.chainGroup === chainGroup);
  }

  getDefault(chainGroup: string): ChainProfile | undefined {
    const group = this.listByGroup(chainGroup);
    return group.find((p) => p.isMainnet) ?? group[0];
  }
}
