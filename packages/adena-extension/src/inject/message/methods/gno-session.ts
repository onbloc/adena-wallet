/**
 * Gno Session Types
 *
 * These types are used to manage real-time synchronization between
 * Gnoweb ActionFunctionController and Adena wallet extension.
 *
 * Adena watches Gnoweb DOM elements directly without requiring Gnoweb modifications:
 * - data-action-function-target="param-input" for parameter inputs
 * - data-action-function-param-value for parameter names
 * - data-action-function-name-value for function name
 * - data-action-function-pkgpath-value for package path
 * - data-action-header-target="mode" for mode selection
 * - data-action-header-target="address" for address input
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

// DOM selectors for Gnoweb elements
export const GNO_DOM_SELECTORS = {
  // ActionFunctionController elements
  FUNCTION_CONTAINER: '[data-controller="action-function"]',
  PARAM_INPUT: '[data-action-function-target="param-input"]',
  FUNCTION_NAME: '[data-action-function-name-value]',
  PKG_PATH: '[data-action-function-pkgpath-value]',
  FUNCTION_EXECUTE: '[data-action-function-target="function-execute"]',
  FUNCTION_ANCHOR: '[data-action-function-target="function-anchor"]',

  // ActionHeaderController elements
  MODE_SELECT: '[data-action-header-target="mode"]',
  ADDRESS_INPUT: '[data-action-header-target="address"]',
} as const;
