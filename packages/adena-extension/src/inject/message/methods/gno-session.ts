/**
 * Gno Session Types
 *
 * These types are used to manage real-time synchronization between
 * Gnoweb ActionFunctionController and Adena wallet extension.
 *
 * Adena subscribes to Gnoweb custom events:
 * - params:changed event for parameter updates
 * - mode:changed event for mode changes
 * - address:changed event for address updates
 */

export interface GnoFunctionInfo {
  funcName: string;
  pkgPath: string;
}

export interface GnoSessionState {
  sessionId: string;
  funcName: string;
  pkgPath: string;
  chainId: string;
  rpc: string;
  address: string;
  mode: GnoActionMode;
  params: Record<string, string>;
  tabId: number;
}

export type GnoActionMode = 'fast' | 'secure';

// Message types for communication between content script and background
export type GnoSessionUpdateType = 'params' | 'mode' | 'address' | 'init';

export interface GnoSessionUpdateData {
  sessionId: string;
  funcName: string;
  pkgPath: string;
  chainId: string;
  rpc: string;
  updateType: GnoSessionUpdateType;
  paramName?: string;
  paramValue?: string;
  allParams?: Record<string, string>;
  send?: string;
  mode?: GnoActionMode;
  address?: string;
}

export interface GnoSessionUpdateMessage {
  type: 'GNO_SESSION_UPDATE';
  data: GnoSessionUpdateData;
}

// Message type for popup to receive updates
export interface PopupSessionUpdateMessage {
  type: 'POPUP_SESSION_UPDATE';
  sessionId: string;
  updateType: GnoSessionUpdateType;
  data: GnoSessionUpdateData;
}
