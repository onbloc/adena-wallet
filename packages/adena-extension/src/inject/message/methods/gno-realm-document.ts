import { GnoDocumentInfo } from '@common/provider/gno';
import { GnoProvider } from '@common/provider/gno/gno-provider';

/**
 * Content script -> background request for a realm document.
 *
 * Content scripts cannot fetch the RPC endpoint themselves on Firefox: they run
 * under an expanded principal (page + extension), so their requests are subject
 * to the *page's* CSP as well as the extension's. Gnoweb pages ship a
 * restrictive `connect-src` that does not include the RPC host, which silently
 * blocked the realm-document fetch backing TxLinks (Chrome does not apply the
 * page CSP to content scripts, which is why the same flow kept working there).
 * The background is bound only by the extension CSP, which allows `https:` RPC
 * hosts and the loopback dev node, so it performs the request on their behalf.
 */
export interface FetchRealmDocumentMessage {
  type: 'FETCH_REALM_DOCUMENT';
  data: {
    rpc: string;
    chainId: string;
    packagePath: string;
  };
}

export interface FetchRealmDocumentResponse {
  document: GnoDocumentInfo | null;
  error?: string;
}

export function isFetchRealmDocumentMessage(
  message: unknown,
): message is FetchRealmDocumentMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const candidate = message as Partial<FetchRealmDocumentMessage>;
  if (candidate.type !== 'FETCH_REALM_DOCUMENT') {
    return false;
  }

  const data = candidate.data;
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.rpc === 'string' &&
    data.rpc.length > 0 &&
    typeof data.chainId === 'string' &&
    typeof data.packagePath === 'string' &&
    data.packagePath.length > 0
  );
}

export async function handleFetchRealmDocument(
  message: FetchRealmDocumentMessage,
): Promise<FetchRealmDocumentResponse> {
  try {
    const provider = new GnoProvider(message.data.rpc, message.data.chainId);
    const document = await provider.getRealmDocument(message.data.packagePath);
    return { document };
  } catch (error) {
    return { document: null, error: `${error}` };
  }
}
