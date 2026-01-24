import { GnoConnectInfoProvider } from '../gno-connect-info-provider';
import { IInterceptor } from '../gno-interceptor.types';
import { GnoSessionUpdateMessage } from '../gno-session';
import { GnoWebEventWatcher } from '../gno-web-event-watcher';

/**
 * Interceptor for GnoWeb custom events
 * Subscribes to Gnoweb custom events and forwards to background
 */
export class GnoWebEventWatcherInterceptor implements IInterceptor {
  public readonly name = 'GnoWebEventWatcherInterceptor';
  private isRegistered = false;
  private watcher: GnoWebEventWatcher | null = null;
  private readonly connectInfoProvider: GnoConnectInfoProvider;
  private readonly onSessionUpdate: (message: GnoSessionUpdateMessage) => void;
  private beforeUnloadHandler: (() => void) | null = null;

  constructor(onSessionUpdate: (message: GnoSessionUpdateMessage) => void) {
    this.connectInfoProvider = GnoConnectInfoProvider.getInstance();
    this.onSessionUpdate = onSessionUpdate;
  }

  public shouldRegister(): boolean {
    return this.connectInfoProvider.shouldRegister();
  }

  public register(): void {
    if (this.isRegistered) {
      return;
    }

    if (!this.shouldRegister()) {
      return;
    }

    this.watcher = new GnoWebEventWatcher(this.onSessionUpdate);

    // Handle DOM ready state
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.startWatcher();
      });
    } else {
      this.startWatcher();
    }

    // Cleanup on page unload
    this.beforeUnloadHandler = (): void => {
      this.stopWatcher();
    };

    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    this.isRegistered = true;
  }

  public unregister(): void {
    if (!this.isRegistered) {
      return;
    }

    this.stopWatcher();

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    this.watcher = null;
    this.isRegistered = false;
  }

  public isActive(): boolean {
    return this.isRegistered && this.watcher !== null;
  }

  /**
   * Start the event watcher
   */
  private startWatcher(): void {
    if (this.watcher) {
      this.watcher.start();
    }
  }

  /**
   * Stop the event watcher
   */
  private stopWatcher(): void {
    if (this.watcher) {
      this.watcher.stop();
    }
  }
}
