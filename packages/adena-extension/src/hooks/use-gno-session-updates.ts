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
}

interface UseGnoSessionUpdatesResult {
  updates: GnoSessionUpdates;
  isConnected: boolean;
  registerSession: (sessionId: string) => void;
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
 * React hook to subscribe to Gno session updates from the background script.
 * This allows popup UI to receive real-time parameter changes from the web page.
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
  } = options;

  const [updates, setUpdates] = useState<GnoSessionUpdates>(initialUpdates);
  const [isConnected, setIsConnected] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);

  const registerSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);

    // Register this popup for the session
    chrome.runtime
      .sendMessage({
        type: 'REGISTER_POPUP_SESSION',
        sessionId,
      })
      .catch(console.warn);
  }, []);

  const handleMessage = useCallback(
    (message: PopupSessionUpdateMessage | unknown) => {
      // Type guard
      if (
        typeof message !== 'object' ||
        message === null ||
        (message as PopupSessionUpdateMessage).type !== 'POPUP_SESSION_UPDATE'
      ) {
        return;
      }

      const update = message as PopupSessionUpdateMessage;
      const { data, updateType } = update;

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

  useEffect(() => {
    // Add message listener
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

  // Initial registration if sessionId provided
  useEffect(() => {
    if (initialSessionId) {
      registerSession(initialSessionId);
    }
  }, [initialSessionId, registerSession]);

  return {
    updates,
    isConnected,
    registerSession,
  };
}

/**
 * Utility hook to get updated transaction parameters.
 * Use this in transaction approval screens to keep params in sync with web page.
 */
export function useUpdatedTransactionParams(
  initialParams: Record<string, string>,
  sessionId?: string,
): {
  params: Record<string, string>;
  hasUpdates: boolean;
  updateCount: number;
} {
  const [params, setParams] = useState(initialParams);
  const [updateCount, setUpdateCount] = useState(0);

  useGnoSessionUpdates({
    sessionId,
    onParamsChange: (newParams) => {
      setParams(newParams);
      setUpdateCount((prev) => prev + 1);
    },
  });

  return {
    params,
    hasUpdates: updateCount > 0,
    updateCount,
  };
}

export default useGnoSessionUpdates;
