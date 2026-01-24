import { CommandHandler } from '@inject/message/command-handler';
import { CommandMessage } from '@inject/message/command-message';
import {
  GnoMessageInfo,
  parseGnoExecFormInfo,
  parseGnoFormInfo,
  shouldInterceptExecForm,
  shouldInterceptForm,
} from '../gno-connect';
import { GnoConnectInfoProvider } from '../gno-connect-info-provider';
import { IInterceptor, InterceptorContext, InterceptorHandler } from '../gno-interceptor.types';

/**
 * Interceptor for form submissions
 * Handles Gnoweb action function forms and exec forms
 */
export class FormSubmitInterceptor implements IInterceptor {
  public readonly name = 'FormSubmitInterceptor';
  private isRegistered = false;
  private submitHandler: ((e: SubmitEvent) => void) | null = null;
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
      return;
    }

    if (!this.shouldRegister()) {
      return;
    }

    this.submitHandler = this.handleSubmit.bind(this);
    document.addEventListener('submit', this.submitHandler, true);
    this.isRegistered = true;
  }

  public unregister(): void {
    if (!this.isRegistered || !this.submitHandler) {
      return;
    }

    document.removeEventListener('submit', this.submitHandler, true);
    this.submitHandler = null;
    this.isRegistered = false;
  }

  public isActive(): boolean {
    return this.isRegistered;
  }

  /**
   * Handle form submit events
   * Only intercepts Gnoweb forms; all other forms continue normal submission
   */
  private handleSubmit(e: SubmitEvent): void {
    try {
      const form = e.target as HTMLFormElement;
      if (!form) {
        return;
      }

      // Only process Gnoweb forms
      // If not a Gnoweb form, return early and let normal submission proceed
      const gnoMessageInfo = this.parseFormData(form);
      if (gnoMessageInfo === null) {
        // Not a Gnoweb form - allow normal form submission
        return;
      }

      // Gnoweb form detected - prevent default submission
      e.preventDefault();
      e.stopPropagation();

      const context = this.createContext();
      if (!context) {
        return;
      }

      this.handler(gnoMessageInfo, context);
    } catch (error) {
      console.warn(`${this.name} error:`, error);
      // On error, allow normal form submission to proceed
    }
  }

  /**
   * Parse form data into GnoMessageInfo
   * Returns null if the form is not a Gnoweb form (allowing normal submission)
   */
  private parseFormData(form: HTMLFormElement): GnoMessageInfo | null {
    // Check for Gnoweb action function form
    if (shouldInterceptForm(form)) {
      return parseGnoFormInfo(form);
    }

    // Check for Gnoweb exec form
    if (shouldInterceptExecForm(form)) {
      return parseGnoExecFormInfo(form);
    }

    // Not a Gnoweb form - return null to allow normal submission
    return null;
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
  private defaultHandler = (gnoMessageInfo: GnoMessageInfo, context: InterceptorContext): void => {
    CommandHandler.createContentHandler(
      CommandMessage.command('checkMetadata', {
        gnoMessageInfo,
        gnoConnectInfo: context.gnoConnectInfo,
      }),
    );
  };
}
