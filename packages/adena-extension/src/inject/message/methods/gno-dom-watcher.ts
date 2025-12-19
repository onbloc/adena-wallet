import { parseGnoConnectInfo } from './gno-connect';
import {
  GnoActionMode,
  GnoFunctionInfo,
  GnoSessionUpdateData,
  GnoSessionUpdateMessage,
  GNO_DOM_SELECTORS,
} from './gno-session';

type UpdateCallback = (message: GnoSessionUpdateMessage) => void;

interface WatchedFunction {
  sessionId: string;
  element: HTMLElement;
  funcName: string;
  pkgPath: string;
  params: Record<string, string>;
}

/**
 * GnoDOMWatcher
 *
 * Watches Gnoweb DOM elements for changes and sends updates to the background script.
 * This allows Adena to track parameter changes without requiring Gnoweb modifications.
 */

export class GnoDOMWatcher {
  private watchedFunctions: Map<string, WatchedFunction> = new Map();
  private currentMode: GnoActionMode = 'secure';
  private currentAddress = '';
  private observer: MutationObserver | null = null;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private onUpdate: UpdateCallback;

  constructor(onUpdate: UpdateCallback) {
    this.onUpdate = onUpdate;
  }

  // Start watching for changes
  public start(): void {
    this.scanForFunctions();
    this.watchModeAndAddress();

    this.observer = new MutationObserver(() => {
      this.scanForFunctions();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.watchedFunctions.clear();
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  private generateSessionId(funcName: string, pkgPath: string): string {
    return `${pkgPath}:${funcName}:${Date.now()}`;
  }

  private scanForFunctions(): void {
    const functionContainers = document.querySelectorAll(GNO_DOM_SELECTORS.FUNCTION_CONTAINER);

    functionContainers.forEach((container) => {
      const element = container as HTMLElement;
      const funcInfo = this.extractFunctionInfo(element);

      if (!funcInfo) return;

      const key = `${funcInfo.pkgPath}:${funcInfo.funcName}`;

      // Already watching this function
      if (this.watchedFunctions.has(key)) return;

      const sessionId = this.generateSessionId(funcInfo.funcName, funcInfo.pkgPath);
      const params = this.extractParams(element);

      const watchedFunc: WatchedFunction = {
        sessionId,
        element,
        funcName: funcInfo.funcName,
        pkgPath: funcInfo.pkgPath,
        params,
      };

      this.watchedFunctions.set(key, watchedFunc);
      this.attachParamListeners(element, watchedFunc);

      // Send initial state
      this.sendUpdate(watchedFunc, 'init', params);
    });
  }

  private extractFunctionInfo(container: HTMLElement): GnoFunctionInfo | null {
    const funcName = container.getAttribute('data-action-function-name-value');
    const pkgPath = container.getAttribute('data-action-function-pkgpath-value');

    if (!funcName || !pkgPath) return null;

    return { funcName, pkgPath };
  }

  private extractParams(container: HTMLElement): Record<string, string> {
    const params: Record<string, string> = {};
    const inputs = container.querySelectorAll(GNO_DOM_SELECTORS.PARAM_INPUT);

    const processed = new Set<string>();

    inputs.forEach((input) => {
      const inputEl = input as HTMLInputElement;
      const paramName = inputEl.getAttribute('data-action-function-param-value');

      if (!paramName || processed.has(paramName)) return;

      params[paramName] = this.getParamValue(container, paramName);
      processed.add(paramName);
    });

    return params;
  }

  private getParamValue(container: HTMLElement, paramName: string): string {
    const inputs = container.querySelectorAll(
      `${GNO_DOM_SELECTORS.PARAM_INPUT}[data-action-function-param-value="${paramName}"]`,
    );

    if (inputs.length === 0) return '';

    const firstInput = inputs[0] as HTMLInputElement;

    // Handle checkbox
    if (firstInput.type === 'checkbox') {
      return Array.from(inputs)
        .filter((inp) => (inp as HTMLInputElement).checked)
        .map((inp) => (inp as HTMLInputElement).value.trim())
        .join(',');
    }

    // Handle radio
    if (firstInput.type === 'radio') {
      const checked = Array.from(inputs).find((inp) => (inp as HTMLInputElement).checked);
      return checked ? (checked as HTMLInputElement).value.trim() : '';
    }

    // Other input types
    return firstInput.value.trim();
  }

  private attachParamListeners(container: HTMLElement, watchedFunc: WatchedFunction): void {
    const inputs = container.querySelectorAll(GNO_DOM_SELECTORS.PARAM_INPUT);

    inputs.forEach((input) => {
      const inputEl = input as HTMLInputElement;

      const handler = (): void => {
        const paramName = inputEl.getAttribute('data-action-function-param-value');
        if (!paramName) return;

        const paramValue = this.getParamValue(container, paramName);
        watchedFunc.params[paramName] = paramValue;

        // Debounce updates
        this.debouncedUpdate(watchedFunc, paramName, paramValue);
      };

      inputEl.addEventListener('input', handler);
      inputEl.addEventListener('change', handler);
    });
  }

  private debouncedUpdate(
    watchedFunc: WatchedFunction,
    paramName: string,
    paramValue: string,
  ): void {
    const key = `${watchedFunc.sessionId}:${paramName}`;

    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.sendUpdate(watchedFunc, 'params', watchedFunc.params, paramName, paramValue);
    }, 50);

    this.debounceTimers.set(key, timer);
  }

  private watchModeAndAddress(): void {
    // Watch mode select
    const modeSelect = document.querySelector(GNO_DOM_SELECTORS.MODE_SELECT) as HTMLSelectElement;
    if (modeSelect) {
      this.currentMode = (modeSelect.value as GnoActionMode) || 'secure';

      modeSelect.addEventListener('change', () => {
        this.currentMode = modeSelect.value as GnoActionMode;
        this.broadcastModeChange();
      });
    }

    // Watch address input
    const addressInput = document.querySelector(
      GNO_DOM_SELECTORS.ADDRESS_INPUT,
    ) as HTMLInputElement;
    if (addressInput) {
      this.currentAddress = addressInput.value.trim();

      const handler = (): void => {
        this.currentAddress = addressInput.value.trim();
        this.broadcastAddressChange();
      };

      addressInput.addEventListener('input', handler);
      addressInput.addEventListener('change', handler);
    }
  }

  private broadcastModeChange(): void {
    this.watchedFunctions.forEach((watchedFunc) => {
      this.sendModeUpdate(watchedFunc);
    });
  }

  private broadcastAddressChange(): void {
    this.watchedFunctions.forEach((watchedFunc) => {
      this.sendAddressUpdate(watchedFunc);
    });
  }

  private getConnectInfo(): { chainId: string; rpc: string } {
    const connectInfo = parseGnoConnectInfo();
    return {
      chainId: connectInfo?.chainId || '',
      rpc: connectInfo?.rpc || '',
    };
  }

  private sendUpdate(
    watchedFunc: WatchedFunction,
    updateType: 'init' | 'params',
    allParams: Record<string, string>,
    paramName?: string,
    paramValue?: string,
  ): void {
    const { chainId, rpc } = this.getConnectInfo();

    const data: GnoSessionUpdateData = {
      sessionId: watchedFunc.sessionId,
      funcName: watchedFunc.funcName,
      pkgPath: watchedFunc.pkgPath,
      chainId,
      rpc,
      updateType,
      allParams,
      paramName,
      paramValue,
    };

    this.onUpdate({ type: 'GNO_SESSION_UPDATE', data });
  }

  private sendModeUpdate(watchedFunc: WatchedFunction): void {
    const { chainId, rpc } = this.getConnectInfo();

    const data: GnoSessionUpdateData = {
      sessionId: watchedFunc.sessionId,
      funcName: watchedFunc.funcName,
      pkgPath: watchedFunc.pkgPath,
      chainId,
      rpc,
      updateType: 'mode',
      mode: this.currentMode,
    };

    this.onUpdate({ type: 'GNO_SESSION_UPDATE', data });
  }

  private sendAddressUpdate(watchedFunc: WatchedFunction): void {
    const { chainId, rpc } = this.getConnectInfo();

    const data: GnoSessionUpdateData = {
      sessionId: watchedFunc.sessionId,
      funcName: watchedFunc.funcName,
      pkgPath: watchedFunc.pkgPath,
      chainId,
      rpc,
      updateType: 'address',
      address: this.currentAddress,
    };

    this.onUpdate({ type: 'GNO_SESSION_UPDATE', data });
  }

  // Public method to get current state for a function
  public getSessionState(funcName: string, pkgPath: string): WatchedFunction | null {
    const key = `${pkgPath}:${funcName}`;
    return this.watchedFunctions.get(key) || null;
  }

  // Public method to get all watched functions
  public getAllSessions(): WatchedFunction[] {
    return Array.from(this.watchedFunctions.values());
  }
}
