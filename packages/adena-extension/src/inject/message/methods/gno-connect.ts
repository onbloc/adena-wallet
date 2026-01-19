import {
  GNO_CHAIN_ID_META_TAG,
  GNO_CONNECT_PREFIX,
  GNO_PACKAGE_PREFIX,
  GNO_RPC_META_TAG,
} from '@common/constants/metatag.constant';
import {
  GNO_HELP_MARKER,
  GNO_FUNC_PARAM,
  GNO_SEND_PARAM,
  GNO_MAX_DEPOSIT_PARAM,
} from '@common/constants/url.constant';
import { hasHttpProtocol } from '@common/provider/gno/utils';

export interface GnoConnectInfo {
  rpc: string;
  chainId: string;
}

export interface GnoMessageInfo {
  packagePath: string;
  functionName: string;
  send: string;
  maxDeposit: string;
  args: GnoArgumentInfo[] | null;
}

export interface GnoArgumentInfo {
  index: number;
  key: string;
  value: string;
}

/**
 * Parses GNO connect information from meta tags in the current document.
 * It looks for two specific meta tags:
 * - gno.connect.rpc (GNO_RPC_META_TAG)
 * - gno.connect.chainId (GNO_CHAIN_ID_META_TAG)
 *
 * @returns GnoConnectInfo object if both tags are found and have non-empty values;
 *          otherwise returns null.
 */
export function parseGnoConnectInfo(): GnoConnectInfo | null {
  if (document === null) {
    return null;
  }

  const gnoConnectInfo: GnoConnectInfo = {
    rpc: '',
    chainId: '',
  };

  const metas = document?.querySelectorAll('meta') || [];

  metas.forEach((meta) => {
    const name = meta.getAttribute('name');
    const content = meta.getAttribute('content') || '';

    if (!name || !name.startsWith(GNO_CONNECT_PREFIX)) {
      return;
    }

    switch (name) {
      case GNO_RPC_META_TAG:
        gnoConnectInfo.rpc = getUrlPathWithoutProtocol(content);
        break;
      case GNO_CHAIN_ID_META_TAG:
        gnoConnectInfo.chainId = content;
        break;
    }
  });

  if (gnoConnectInfo.rpc === '' || gnoConnectInfo.chainId === '') {
    return null;
  }

  return gnoConnectInfo;
}

/**
 * Parses message information from the current window location URL.
 * The URL must contain '$help' in its pathname and at least one 'func=' parameter.
 * Additional parameters (send=..., etc.) are also processed.
 *
 * Example:
 *   https://gno.land/r/demo/boards$help&func=CreateThread&bid=2&send=100ugnot
 *   - $help acts as a marker to split the pathname.
 *   - func= specifies functionName.
 *   - .send= specifies the amount to send.
 *   - other parameters are collected in the args array.
 *
 * @returns GnoMessageInfo object (packagePath, functionName, send, args)
 *          if $help is found and func is provided; otherwise returns null.
 */
export function parseGnoMessageInfo(href: string): GnoMessageInfo | null {
  const url = new URL(href);
  const { pathname } = url;
  if (!pathname.includes(GNO_HELP_MARKER)) {
    return null;
  }

  const messageInfo: GnoMessageInfo = {
    packagePath: '',
    functionName: '',
    send: '',
    maxDeposit: '',
    args: null,
  };

  const [beforeHelp, afterHelp] = pathname.split(GNO_HELP_MARKER);
  const packagePostfix = `${beforeHelp}`.replace(/^\/+/, '');
  if (packagePostfix === '') {
    return null;
  }

  const queryPart = afterHelp.replace(/^&+/, '');
  const parts = queryPart.split('&');

  const args: GnoArgumentInfo[] = [];
  let argumentIndex = 0;

  for (const p of parts) {
    const params = p.split('=');
    if (params.length < 2) {
      continue;
    }

    const [key, value] = params;

    switch (key) {
      case GNO_FUNC_PARAM:
        messageInfo.functionName = value || '';
        continue;
      case GNO_SEND_PARAM:
        messageInfo.send = value || '';
        continue;
      case GNO_MAX_DEPOSIT_PARAM:
        messageInfo.maxDeposit = value || '';
        continue;
      default:
        args.push({
          index: argumentIndex,
          key,
          value: decodeURIComponent(value),
        });
    }

    argumentIndex++;
  }

  if (!messageInfo.functionName) {
    return null;
  }

  messageInfo.packagePath = GNO_PACKAGE_PREFIX + '/' + packagePostfix;

  if (args.length !== 0) {
    messageInfo.args = args;
  }

  return messageInfo;
}

/**
 * Parses GnoMessageInfo from a form element.
 * Extracts function information from article data attributes
 * and parameters from form inputs.
 *
 * @param form - The form element to parse
 * @returns GnoMessageInfo object if valid; otherwise returns null
 */
export function parseGnoFormInfo(form: HTMLFormElement): GnoMessageInfo | null {
  const article = form.closest('article.b-action-function') as HTMLElement;

  if (!article) {
    return null;
  }

  // Extract function information from article data attributes
  const funcName = article.dataset.actionFunctionNameValue;
  const pkgPath = article.dataset.actionFunctionPkgpathValue;

  if (!funcName || !pkgPath) {
    return null;
  }

  const messageInfo: GnoMessageInfo = {
    packagePath: pkgPath,
    functionName: funcName,
    send: '',
    maxDeposit: '',
    args: null,
  };

  // Extract parameters from form inputs
  const args: GnoArgumentInfo[] = [];
  const paramInputs = form.querySelectorAll('input[data-action-function-param-value]');

  paramInputs.forEach((input, index) => {
    const paramName = (input as HTMLInputElement).dataset.actionFunctionParamValue;
    const paramValue = (input as HTMLInputElement).value;

    if (paramName) {
      args.push({
        index,
        key: paramName,
        value: paramValue,
      });
    }
  });

  if (args.length > 0) {
    messageInfo.args = args;
  }

  return messageInfo;
}

export function shouldIntercept(href: string): boolean {
  const gnoMessageInfo = parseGnoMessageInfo(href);
  if (!gnoMessageInfo) {
    return false;
  }

  return true;
}

export function shouldRegisterAnchorIntercept(): boolean {
  const gnoMessageInfo = parseGnoConnectInfo();
  if (!gnoMessageInfo) {
    return false;
  }

  return true;
}

/**
 * Checks if a form element is a valid Gnoweb action function form.
 *
 * @param target - The event target to check
 * @returns true if the target is a valid Gnoweb form; otherwise false
 */
export function shouldInterceptForm(target: EventTarget | null): boolean {
  if (!target) {
    return false;
  }

  const element = target as HTMLElement;

  if (!element.matches('article.b-action-function form.params')) {
    return false;
  }

  return true;
}

export function getUrlPathWithoutProtocol(url: string): string {
  const trimmedUrl = url.trim();

  if (hasHttpProtocol(trimmedUrl)) {
    return trimmedUrl;
  }

  return trimmedUrl.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, '');
}
