import { GnoConnectInfo, GnoMessageInfo } from './gno-connect';

/**
 * Interceptor execution result
 */
export interface InterceptorResult {
  success: boolean;
  gnoMessageInfo: GnoMessageInfo | null;
  error?: Error;
}

/**
 * Base interface for all interceptors
 */
export interface IInterceptor {
  readonly name: string;

  shouldRegister(): boolean;
  register(): void;
  unregister(): void;
  isActive(): boolean;
}

/**
 * Context for interceptor execution
 */
export interface InterceptorContext {
  gnoConnectInfo: GnoConnectInfo;
}

/**
 * Handler function for processing intercepted data
 */
export type InterceptorHandler = (
  gnoMessageInfo: GnoMessageInfo,
  context: InterceptorContext,
) => Promise<void> | void;
