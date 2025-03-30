import {
  GNO_CHAIN_ID_META_TAG,
  GNO_CONNECT_PREFIX,
  GNO_PACKAGE_PREFIX,
  GNO_RPC_META_TAG,
} from '@common/constants/metatag.constant';

export interface GnoConnectInfo {
  rpc: string;
  chainId: string;
}

export interface GnoMessageInfo {
  packagePath: string;
  functionName: string;
  send: string;
  args: string[] | null;
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
        gnoConnectInfo.rpc = content;
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
 *   - send= specifies the amount to send.
 *   - other parameters are collected in the args array.
 *
 * @returns GnoMessageInfo object (packagePath, functionName, send, args)
 *          if $help is found and func is provided; otherwise returns null.
 */
export function parseGnoMessageInfo(href: string): GnoMessageInfo | null {
  const url = new URL(href);
  const { pathname } = url;
  if (!pathname.includes('$help')) {
    return null;
  }

  const messageInfo: GnoMessageInfo = {
    packagePath: '',
    functionName: '',
    send: '',
    args: null,
  };
  const splitter = '$help';
  if (!pathname.includes(splitter)) {
    return null;
  }

  const [beforeHelp, afterHelp] = pathname.split('$help');
  const packagePostfix = `${beforeHelp}`.replace(/^\/+/, '');
  if (packagePostfix === '') {
    return null;
  }

  const queryPart = afterHelp.replace(/^&+/, '');
  const parts = queryPart.split('&');

  const args: string[] = [];

  for (const p of parts) {
    const params = p.split('=');
    if (params.length < 2) {
      continue;
    }

    const param = params[1];

    if (p.startsWith('func=')) {
      messageInfo.functionName = param || '';
      continue;
    }

    if (p.startsWith('send=')) {
      messageInfo.send = param || '';
      continue;
    }

    args.push(param);
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
