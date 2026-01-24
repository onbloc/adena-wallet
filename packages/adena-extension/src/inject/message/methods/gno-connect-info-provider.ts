import { GnoConnectInfo, parseGnoConnectInfo } from './gno-connect';

/**
 * Singleton provider for GnoConnectInfo
 * Caches the parsed connection info to avoid repeated DOM queries
 */
export class GnoConnectInfoProvider {
  private static instance: GnoConnectInfoProvider | null = null;
  private cachedInfo: GnoConnectInfo | null = null;
  private lastCheckTime = 0;
  private readonly CACHE_TTL_MS = 1000; // Cache for 1 second

  /**
   * Get singleton instance
   */
  public static getInstance(): GnoConnectInfoProvider {
    if (!GnoConnectInfoProvider.instance) {
      GnoConnectInfoProvider.instance = new GnoConnectInfoProvider();
    }
    return GnoConnectInfoProvider.instance;
  }

  /**
   * Get GnoConnectInfo, with caching
   */
  public getConnectInfo(): GnoConnectInfo | null {
    const now = Date.now();
    const isCacheValid = this.cachedInfo !== null && now - this.lastCheckTime < this.CACHE_TTL_MS;

    if (isCacheValid) {
      return this.cachedInfo;
    }

    this.cachedInfo = parseGnoConnectInfo();
    this.lastCheckTime = now;

    return this.cachedInfo;
  }

  /**
   * Check if interceptor should be registered
   */
  public shouldRegister(): boolean {
    return this.getConnectInfo() !== null;
  }

  /**
   * Clear cache (useful for testing or when DOM changes)
   */
  public clearCache(): void {
    this.cachedInfo = null;
    this.lastCheckTime = 0;
  }

  /**
   * Reset singleton (mainly for testing)
   */
  public static reset(): void {
    GnoConnectInfoProvider.instance = null;
  }
}
