import { HTTP_TIMEOUT_MS } from '../../config/endpoints';
import { AppError, AppErrorCode } from '../../core/errors';

export interface HttpRequest {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

// Transport abstraction for every REST/GraphQL data source; swap it to mock the network.
export interface HttpClient {
  request<T>(url: string, init?: HttpRequest): Promise<T>;
}

export class FetchHttpClient implements HttpClient {
  async request<T>(url: string, init: HttpRequest = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? HTTP_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: init.method ?? 'GET',
        headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        signal: controller.signal as unknown as RequestInit['signal'],
      });

      if (!response.ok) {
        throw new AppError(AppErrorCode.NETWORK_ERROR, `Request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    }
    catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(AppErrorCode.NETWORK_ERROR, (error as Error)?.message ?? 'Network request failed', { cause: error });
    }
    finally {
      clearTimeout(timer);
    }
  }
}
