import axios from 'axios';

// tm2-rpc's HttpClient turns any HTTP status >= 400 into this message.
const BAD_STATUS_PATTERN = /bad status on response:\s*(\d{3})/i;

const TRANSPORT_MESSAGE_PATTERN = /failed to fetch|network\s?error|load failed|request aborted|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|timeout|socket hang up/i;

function isServerSideStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

/**
 * Whether a rejected RPC call means "this endpoint is not answering" rather
 * than "the chain answered, and the answer was an error". Only the former may
 * trigger a fallback, since the fallback would reproduce the latter anyway.
 */
export function isTransportError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (axios.isAxiosError(error)) {
    return !error.response || isServerSideStatus(error.response.status);
  }

  const message = error instanceof Error ? error.message : String(error);

  const badStatus = BAD_STATUS_PATTERN.exec(message);
  if (badStatus) {
    return isServerSideStatus(Number(badStatus[1]));
  }

  return TRANSPORT_MESSAGE_PATTERN.test(message);
}

/**
 * A network's RPC endpoints used as a ring: the configured `rpcUrl`, then the
 * optional `fallbackRPCUrl` from `chains.json`.
 *
 * Requests start on `rpcUrl`. A transport failure rotates to the next endpoint
 * and retries there, and the rotation sticks, so the retry and every later
 * request use `fallbackRPCUrl` instead of paying the dead endpoint's timeout
 * again. A transport failure on `fallbackRPCUrl` rotates back to `rpcUrl` the
 * same way. Each `run` tries every endpoint at most once before giving up.
 */
export class RpcEndpointSelector {
  private readonly endpoints: string[];

  private activeIndex = 0;

  constructor(rpcUrl: string, fallbackRPCUrl?: string) {
    this.endpoints =
      fallbackRPCUrl && fallbackRPCUrl !== rpcUrl ? [rpcUrl, fallbackRPCUrl] : [rpcUrl];
  }

  public get active(): string {
    return this.endpoints[this.activeIndex];
  }

  public async run<T>(request: (endpoint: string) => Promise<T>): Promise<T> {
    let lastTransportError: unknown;

    for (let attempt = 0; attempt < this.endpoints.length; attempt++) {
      const attemptedIndex = this.activeIndex;

      try {
        return await request(this.endpoints[attemptedIndex]);
      } catch (error) {
        if (!isTransportError(error)) {
          throw error;
        }

        lastTransportError = error;
        this.rotateFrom(attemptedIndex);
      }
    }

    throw lastTransportError;
  }

  private rotateFrom(attemptedIndex: number): void {
    // A concurrent request may already have rotated away from the endpoint this
    // call tried; leave its choice alone rather than rotating twice.
    if (this.activeIndex !== attemptedIndex) {
      return;
    }

    this.activeIndex = (attemptedIndex + 1) % this.endpoints.length;
  }
}
