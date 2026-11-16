import Transport from '@ledgerhq/hw-transport';
import CosmosApp, { AppInfoResponse } from 'ledger-cosmos-js';

import { LedgerError } from './ledger-errors';

const DEFAULT_POLL_INTERVAL_MS = 200;
const DEFAULT_POLL_MAX_ATTEMPTS = 25;
const BOLOS_CLA = 0xe0;
const BOLOS_INS_OPEN_APP = 0xd8;
const NO_ERRORS_MESSAGE = 'No errors';

export interface AppInfo {
  appName: string;
  errorMessage: string;
  returnCode: number;
}

export interface EnsureAppOpenOptions {
  reopenTransport?: () => Promise<Transport>;
  pollIntervalMs?: number;
  maxAttempts?: number;
}

export async function getAppInfo(transport: Transport): Promise<AppInfo | null> {
  try {
    const app = new CosmosApp(transport);
    const response = (await app.appInfo()) as Partial<AppInfoResponse>;
    const appName = typeof response.appName === 'string' ? response.appName : null;
    if (!appName) {
      return null;
    }
    return {
      appName,
      errorMessage: response.error_message ?? '',
      returnCode: response.return_code ?? 0,
    };
  } catch {
    return null;
  }
}

export async function openApp(transport: Transport, appName: string): Promise<void> {
  await transport.send(
    BOLOS_CLA,
    BOLOS_INS_OPEN_APP,
    0x00,
    0x00,
    Buffer.from(appName, 'ascii'),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAppMatch(info: AppInfo | null, expectedApp: string): boolean {
  return !!info && info.appName === expectedApp && info.errorMessage === NO_ERRORS_MESSAGE;
}

export async function ensureAppOpen(
  transport: Transport,
  expectedApp = 'Cosmos',
  options: EnsureAppOpenOptions = {},
): Promise<Transport> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS;

  const current = await getAppInfo(transport);
  if (isAppMatch(current, expectedApp)) {
    return transport;
  }

  try {
    await openApp(transport, expectedApp);
  } catch {
    // openApp often disconnects the transport; polling below will re-check.
  }

  let activeTransport = transport;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(pollIntervalMs);

    if (options.reopenTransport) {
      try {
        activeTransport = await options.reopenTransport();
      } catch {
        continue;
      }
    }

    const info = await getAppInfo(activeTransport);
    if (isAppMatch(info, expectedApp)) {
      return activeTransport;
    }
  }

  throw new LedgerError(
    'AppNotOpen',
    `Expected Ledger app "${expectedApp}" but it did not open in time`,
  );
}
