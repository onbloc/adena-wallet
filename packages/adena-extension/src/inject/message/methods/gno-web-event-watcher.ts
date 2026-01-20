// packages/adena-extension/src/inject/message/methods/gno-web-event-watcher.ts

import { parseGnoConnectInfo } from './gno-connect';
import { GnoSessionUpdateMessage } from './gno-session';

/**
 * Session state for tracking active Gnoweb forms
 */
interface SessionState {
  sessionId: string;
  funcName: string;
  pkgPath: string;
}

/**
 * Callback type for session updates
 */
type UpdateCallback = (message: GnoSessionUpdateMessage) => void;

/**
 * GnoWebEventWatcher
 *
 * Listens to Gnoweb custom events (params:changed, mode:changed, address:changed)
 * and forwards updates to the background script.
 *
 * This replaces the previous DOM-based watcher with a cleaner event-driven approach.
 */
export class GnoWebEventWatcher {
  private onUpdate: UpdateCallback;
  private sessions: Map<string, SessionState> = new Map();
  private eventHandlers: Map<string, EventListener> = new Map();

  constructor(onUpdate: UpdateCallback) {
    this.onUpdate = onUpdate;
  }

  /**
   * Start listening to Gnoweb events
   */
  public start(): void {
    this.registerEventListener('params:changed', this.handleParamsChanged.bind(this));
    this.registerEventListener('mode:changed', this.handleModeChanged.bind(this));
    this.registerEventListener('address:changed', this.handleAddressChanged.bind(this));
  }

  /**
   * Stop listening and cleanup
   */
  public stop(): void {
    this.eventHandlers.forEach((handler, eventType) => {
      document.removeEventListener(eventType, handler);
    });

    this.eventHandlers.clear();
    this.sessions.clear();
  }

  /**
   * Register event listener helper
   */
  private registerEventListener(eventType: string, handler: EventListener): void {
    document.addEventListener(eventType, handler);
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Handle params:changed event from Gnoweb
   */
  private handleParamsChanged(event: Event): void {
    const customEvent = event as CustomEvent<GnoWebParamsChangedDetail>;
    const detail = customEvent.detail;

    // Validate event data
    if (!detail || !detail.funcName || !detail.pkgPath) {
      return;
    }

    // Get or create session
    const sessionId = this.getOrCreateSessionId(detail.funcName, detail.pkgPath);

    // Extract gno-connect info
    const connectInfo = this.getConnectInfo();

    // Send update to background
    this.sendUpdate({
      type: 'GNO_SESSION_UPDATE',
      data: {
        sessionId,
        funcName: detail.funcName,
        pkgPath: detail.pkgPath,
        chainId: connectInfo.chainId,
        rpc: connectInfo.rpc,
        updateType: 'params',
        allParams: detail.params,
        send: detail.send,
      },
    });
  }

  /**
   * Handle mode:changed event from Gnoweb
   */
  private handleModeChanged(event: Event): void {
    const customEvent = event as CustomEvent<GnoWebModeChangedDetail>;
    const mode = customEvent.detail?.mode;

    if (!mode) {
      return;
    }

    // Broadcast to all active sessions
    const connectInfo = this.getConnectInfo();

    this.sessions.forEach((session) => {
      this.sendUpdate({
        type: 'GNO_SESSION_UPDATE',
        data: {
          sessionId: session.sessionId,
          funcName: session.funcName,
          pkgPath: session.pkgPath,
          chainId: connectInfo.chainId,
          rpc: connectInfo.rpc,
          updateType: 'mode',
          mode,
        },
      });
    });
  }

  /**
   * Handle address:changed event from Gnoweb
   */
  private handleAddressChanged(event: Event): void {
    const customEvent = event as CustomEvent<GnoWebAddressChangedDetail>;
    const address = customEvent.detail?.address;

    if (!address) {
      return;
    }

    // Broadcast to all active sessions
    const connectInfo = this.getConnectInfo();

    this.sessions.forEach((session) => {
      this.sendUpdate({
        type: 'GNO_SESSION_UPDATE',
        data: {
          sessionId: session.sessionId,
          funcName: session.funcName,
          pkgPath: session.pkgPath,
          chainId: connectInfo.chainId,
          rpc: connectInfo.rpc,
          updateType: 'address',
          address,
        },
      });
    });
  }

  /**
   * Get or create session ID for a function
   */
  private getOrCreateSessionId(funcName: string, pkgPath: string): string {
    const key = `${pkgPath}:${funcName}`;

    let session = this.sessions.get(key);
    if (!session) {
      const sessionId = `${key}:${Date.now()}`;
      session = {
        sessionId,
        funcName,
        pkgPath,
      };
      this.sessions.set(key, session);
    }

    return session.sessionId;
  }

  /**
   * Extract gno-connect info from meta tag
   */
  private getConnectInfo(): { chainId: string; rpc: string } {
    const connectInfo = parseGnoConnectInfo();
    return {
      chainId: connectInfo?.chainId || '',
      rpc: connectInfo?.rpc || '',
    };
  }

  /**
   * Send update to background script via callback
   */
  private sendUpdate(message: GnoSessionUpdateMessage): void {
    this.onUpdate(message);
  }
}
