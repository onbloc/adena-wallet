import { CommandHandler } from '@inject/message/command-handler';
import { CommandMessage } from '@inject/message/command-message';
import { GnoConnectInfoProvider } from '../gno-connect-info-provider';
import { GnoMessageInfo, parseGnoMessageInfo, shouldIntercept } from '../gno-connect';
import { IInterceptor, InterceptorContext, InterceptorHandler } from '../gno-interceptor.types';

/**
 * Interceptor for anchor/link clicks
 * Handles gno web tx links by intercepting anchor clicks
 */
export class AnchorInterceptor implements IInterceptor {
  public readonly name = 'AnchorInterceptor';
  private isRegistered = false;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private readonly connectInfoProvider: GnoConnectInfoProvider;
  private readonly handler: InterceptorHandler;

  constructor(handler?: InterceptorHandler) {
    this.connectInfoProvider = GnoConnectInfoProvider.getInstance();
    this.handler = handler || this.defaultHandler;
  }

  public shouldRegister(): boolean {
    return this.connectInfoProvider.shouldRegister();
  }

  public register(): void {
    if (this.isRegistered) {
      console.warn(`${this.name} is already registered`);
      return;
    }

    if (!this.shouldRegister()) {
      return;
    }

    this.clickHandler = this.handleClick.bind(this);
    document.addEventListener('click', this.clickHandler, true);
    this.isRegistered = true;
  }

  public unregister(): void {
    if (!this.isRegistered || !this.clickHandler) {
      return;
    }

    document.removeEventListener('click', this.clickHandler, true);
    this.clickHandler = null;
    this.isRegistered = false;
  }

  public isActive(): boolean {
    return this.isRegistered;
  }

  /**
   * Handle click events on anchor elements
   */
  private handleClick(e: MouseEvent): void {
    try {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor?.href) {
        return;
      }

      const url = new URL(anchor.href, location.origin);
      if (!shouldIntercept(url.href)) {
        return;
      }

      const gnoMessageInfo = parseGnoMessageInfo(url.href);
      if (gnoMessageInfo === null) {
        return;
      }

      e.preventDefault();

      const context = this.createContext();
      if (!context) {
        return;
      }

      this.handler(gnoMessageInfo, context);
    } catch (error) {
      console.warn(`${this.name} error:`, error);
    }
  }

  /**
   * Create interceptor context
   */
  private createContext(): InterceptorContext | null {
    const gnoConnectInfo = this.connectInfoProvider.getConnectInfo();
    if (!gnoConnectInfo) {
      return null;
    }

    return { gnoConnectInfo };
  }

  /**
   * Default handler for intercepted messages
   */
  private defaultHandler = (
    gnoMessageInfo: GnoMessageInfo,
    context: InterceptorContext,
  ): void => {
    CommandHandler.createContentHandler(
      CommandMessage.command('checkMetadata', {
        gnoMessageInfo,
        gnoConnectInfo: context.gnoConnectInfo,
      }),
    );
  };
}
