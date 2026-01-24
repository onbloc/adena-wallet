import { GnoConnectInfoProvider } from './gno-connect-info-provider';
import { IInterceptor } from './gno-interceptor.types';
import { GnoSessionUpdateMessage } from './gno-session';
import { AnchorInterceptor } from './interceptors/anchor-interceptor';
import { FormSubmitInterceptor } from './interceptors/form-submit-interceptor';
import { GnoWebEventWatcherInterceptor } from './interceptors/gno-web-event-watcher-interceptor';

/**
 * Central manager for all GNO interceptors
 * Provides unified registration, lifecycle management, and error handling
 */
export class GnoInterceptorManager {
  private static instance: GnoInterceptorManager | null = null;
  private interceptors: Map<string, IInterceptor> = new Map();
  private isInitialized = false;
  private readonly connectInfoProvider: GnoConnectInfoProvider;

  private constructor() {
    this.connectInfoProvider = GnoConnectInfoProvider.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GnoInterceptorManager {
    if (!GnoInterceptorManager.instance) {
      GnoInterceptorManager.instance = new GnoInterceptorManager();
    }
    return GnoInterceptorManager.instance;
  }

  /**
   * Initialize all interceptors
   * @param onSessionUpdate - Callback for GnoSessionUpdate messages
   */
  public initialize(onSessionUpdate?: (message: GnoSessionUpdateMessage) => void): void {
    if (this.isInitialized) {
      return;
    }

    // Check if interceptors should be registered
    if (!this.connectInfoProvider.shouldRegister()) {
      return;
    }

    try {
      // Register anchor interceptor
      const anchorInterceptor = new AnchorInterceptor();
      this.registerInterceptor(anchorInterceptor);

      // Register form submit interceptor
      const formInterceptor = new FormSubmitInterceptor();
      this.registerInterceptor(formInterceptor);

      // Register event watcher interceptor
      if (onSessionUpdate) {
        const eventWatcherInterceptor = new GnoWebEventWatcherInterceptor(onSessionUpdate);
        this.registerInterceptor(eventWatcherInterceptor);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize GnoInterceptorManager:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Register a single interceptor
   */
  public registerInterceptor(interceptor: IInterceptor): void {
    if (this.interceptors.has(interceptor.name)) {
      return;
    }

    try {
      if (!interceptor.shouldRegister()) {
        return;
      }

      interceptor.register();
      this.interceptors.set(interceptor.name, interceptor);
    } catch (error) {
      console.error(`Failed to register interceptor ${interceptor.name}:`, error);
    }
  }

  /**
   * Unregister a specific interceptor
   */
  public unregisterInterceptor(name: string): void {
    const interceptor = this.interceptors.get(name);
    if (!interceptor) {
      return;
    }

    try {
      interceptor.unregister();
      this.interceptors.delete(name);
    } catch (error) {
      console.error(`Failed to unregister interceptor ${name}:`, error);
    }
  }

  /**
   * Get a specific interceptor
   */
  public getInterceptor(name: string): IInterceptor | undefined {
    return this.interceptors.get(name);
  }

  /**
   * Get all registered interceptors
   */
  public getAllInterceptors(): IInterceptor[] {
    return Array.from(this.interceptors.values());
  }

  /**
   * Get active interceptors
   */
  public getActiveInterceptors(): IInterceptor[] {
    return this.getAllInterceptors().filter((interceptor) => interceptor.isActive());
  }

  /**
   * Cleanup all interceptors
   */
  public cleanup(): void {
    const interceptorNames = Array.from(this.interceptors.keys());
    interceptorNames.forEach((name) => {
      this.unregisterInterceptor(name);
    });

    this.interceptors.clear();
    this.isInitialized = false;
  }

  /**
   * Reinitialize interceptors (useful when DOM changes)
   */
  public reinitialize(onSessionUpdate?: (message: GnoSessionUpdateMessage) => void): void {
    this.cleanup();
    this.connectInfoProvider.clearCache();
    this.initialize(onSessionUpdate);
  }

  /**
   * Check if manager is initialized
   */
  public getInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset singleton (mainly for testing)
   */
  public static reset(): void {
    if (GnoInterceptorManager.instance) {
      GnoInterceptorManager.instance.cleanup();
      GnoInterceptorManager.instance = null;
    }
  }
}
