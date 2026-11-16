import { useCallback, useEffect, useState } from 'react';

import {
  GnoSessionState,
  GnoSessionUpdateType,
  PopupSessionUpdateMessage,
} from '@inject/message/methods/gno-session';

interface GnoSessionUpdates {
  sessionId: string | null;
  funcName: string | null;
  pkgPath: string | null;
  chainId: string | null;
  rpc: string | null;
  params: Record<string, string>;
  mode: GnoSessionState['mode'];
  address: string;
  lastUpdate: GnoSessionUpdateType | null;
  lastUpdateTime: number;
}

interface UseGnoSessionUpdatesOptions {
  sessionId?: string;
  funcName?: string;
  pkgPath?: string;
  onParamsChange?: (
    params: Record<string, string>,
    paramName?: string,
    paramValue?: string,
  ) => void;
  onModeChange?: (mode: GnoSessionState['mode']) => void;
  onAddressChange?: (address: string) => void;
  loadInitialSession?: boolean;
}

interface UseGnoSessionUpdatesResult {
  updates: GnoSessionUpdates;
  isConnected: boolean;
  loading: boolean;
  registerSession: (sessionId: string) => void;
  refresh: () => Promise<void>;
}

const initialUpdates: GnoSessionUpdates = {
  sessionId: null,
  funcName: null,
  pkgPath: null,
  chainId: null,
  rpc: null,
  params: {},
  mode: 'secure',
  address: '',
  lastUpdate: null,
  lastUpdateTime: 0,
};

/**
 * Type guard for PopupSessionUpdateMessage
 */
function isPopupSessionUpdateMessage(message: unknown): message is PopupSessionUpdateMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const msg = message as Record<string, unknown>;

  return (
    'type' in msg &&
    msg.type === 'POPUP_SESSION_UPDATE' &&
    'data' in msg &&
    typeof msg.data === 'object' &&
    msg.data !== null &&
    'updateType' in msg &&
    typeof msg.updateType === 'string'
  );
}

/**
 * React hook to subscribe to Gno session updates from the background script.
 * This allows popup UI to receive real-time parameter changes from the web page.
 *
 * @example
 * ```tsx
 * const { updates, loading, refresh } = useGnoSessionUpdates({
 *   funcName: 'Approve',
 *   pkgPath: 'gno.land/r/demo/wugnot',
 *   onParamsChange: (params, changedParam, changedValue) => {
 *     console.log('Parameters updated:', params);
 *     if (changedParam) {
 *       console.log('Changed:', changedParam, '=', changedValue);
 *     }
 *   }
 * });
 * ```
 */
export function useGnoSessionUpdates(
  options: UseGnoSessionUpdatesOptions = {},
): UseGnoSessionUpdatesResult {
  const {
    sessionId: initialSessionId,
    funcName,
    pkgPath,
    onParamsChange,
    onModeChange,
    onAddressChange,
    loadInitialSession = true,
  } = options;

  const [updates, setUpdates] = useState<GnoSessionUpdates>(initialUpdates);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);

  /**
   * Load initial session state from background
   */
  const loadSession = useCallback(async () => {
    if (!loadInitialSession) {
      return;
    }

    setLoading(true);

    try {
      let session: GnoSessionState | null = null;

      if (activeSessionId) {
        // Get specific session by ID
        session = await chrome.runtime.sendMessage({
          type: 'GET_GNO_SESSION',
          sessionId: activeSessionId,
        });
      } else if (funcName && pkgPath) {
        // Get active session by function
        session = await chrome.runtime.sendMessage({
          type: 'GET_ACTIVE_SESSION',
          funcName,
          pkgPath,
        });
      }

      if (session) {
        console.log('[useGnoSessionUpdates] Initial session loaded:', session);

        setUpdates({
          sessionId: session.sessionId,
          funcName: session.funcName,
          pkgPath: session.pkgPath,
          chainId: session.chainId,
          rpc: session.rpc,
          params: session.params,
          mode: session.mode,
          address: session.address,
          lastUpdate: 'init',
          lastUpdateTime: Date.now(),
        });

        // Trigger initial callbacks
        if (session.params && Object.keys(session.params).length > 0) {
          onParamsChange?.(session.params);
        }
        if (session.mode) {
          onModeChange?.(session.mode);
        }
        if (session.address) {
          onAddressChange?.(session.address);
        }
      }
    } catch (error) {
      console.error('[useGnoSessionUpdates] Failed to load initial session:', error);
    } finally {
      setLoading(false);
    }
  }, [
    activeSessionId,
    funcName,
    pkgPath,
    loadInitialSession,
    onParamsChange,
    onModeChange,
    onAddressChange,
  ]);

  /**
   * Register this popup for a specific session
   */
  const registerSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);

    // Register this popup for the session
    chrome.runtime
      .sendMessage({
        type: 'REGISTER_POPUP_SESSION',
        sessionId,
      });
  }, []);

  /**
   * Handle session update messages from background
   */
  const handleMessage = useCallback(
    (message: unknown) => {
      // Type guard
      if (!isPopupSessionUpdateMessage(message)) {
        return;
      }

      const { data, updateType } = message;

      // Filter by sessionId if specified
      if (activeSessionId && data.sessionId !== activeSessionId) {
        return;
      }

      // Filter by funcName/pkgPath if specified
      if (funcName && data.funcName !== funcName) {
        return;
      }

      if (pkgPath && data.pkgPath !== pkgPath) {
        return;
      }

      setUpdates((prev) => {
        const newUpdates: GnoSessionUpdates = {
          ...prev,
          sessionId: data.sessionId,
          funcName: data.funcName,
          pkgPath: data.pkgPath,
          chainId: data.chainId,
          rpc: data.rpc,
          lastUpdate: updateType,
          lastUpdateTime: Date.now(),
        };

        switch (updateType) {
          case 'init':
          case 'params':
            if (data.allParams) {
              newUpdates.params = data.allParams;
              onParamsChange?.(data.allParams, data.paramName, data.paramValue);
            }
            break;
          case 'mode':
            if (data.mode) {
              newUpdates.mode = data.mode;
              onModeChange?.(data.mode);
            }
            break;
          case 'address':
            if (data.address !== undefined) {
              newUpdates.address = data.address;
              onAddressChange?.(data.address);
            }
            break;
        }

        return newUpdates;
      });
    },
    [activeSessionId, funcName, pkgPath, onParamsChange, onModeChange, onAddressChange],
  );

  /**
   * Load initial session on mount
   */
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  /**
   * Setup message listener
   */
  useEffect(() => {
    const listener = (message: unknown): void => {
      handleMessage(message);
    };

    chrome.runtime.onMessage.addListener(listener);
    setIsConnected(true);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      setIsConnected(false);
    };
  }, [handleMessage]);

  /**
   * Initial registration if sessionId provided
   */
  useEffect(() => {
    if (initialSessionId) {
      registerSession(initialSessionId);
    }
  }, [initialSessionId, registerSession]);

  return {
    updates,
    isConnected,
    loading,
    registerSession,
    refresh: loadSession,
  };
}

/**
 * Utility hook to get updated transaction parameters.
 * Use this in transaction approval screens to keep params in sync with web page.
 *
 * @example
 * ```tsx
 * const { params, hasUpdates, updateCount } = useUpdatedTransactionParams(
 *   { spender: 'g1...', amount: '1000000' },
 *   sessionId,
 *   'Approve',
 *   'gno.land/r/demo/wugnot'
 * );
 *
 * if (hasUpdates) {
 *   console.log(`Parameters updated ${updateCount} times`);
 * }
 * ```
 */
export function useUpdatedTransactionParams(
  initialParams: Record<string, string>,
  sessionId?: string,
  funcName?: string,
  pkgPath?: string,
): {
  params: Record<string, string>;
  hasUpdates: boolean;
  updateCount: number;
  loading: boolean;
} {
  const [params, setParams] = useState(initialParams);
  const [updateCount, setUpdateCount] = useState(0);

  const { loading } = useGnoSessionUpdates({
    sessionId,
    funcName,
    pkgPath,
    onParamsChange: (newParams) => {
      setParams(newParams);
      setUpdateCount((prev) => prev + 1);
    },
  });

  return {
    params,
    hasUpdates: updateCount > 0,
    updateCount,
    loading,
  };
}

export default useGnoSessionUpdates;
