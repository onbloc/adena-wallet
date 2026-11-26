import { HTTP_TIMEOUT_MS } from '../../config/endpoints';
import { AppError, AppErrorCode } from '../../core/errors';

export interface HttpRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

// Transport abstraction for every REST/GraphQL data source; swap it to mock the network.
export interface HttpClient {
  request<T>(url: string, init?: HttpRequest): Promise<T>;
}

// Non-2xx response; keeps the status and parsed body so callers can tell a real not-found apart.
export class HttpStatusError extends AppError {
  constructor(readonly status: number, readonly body: unknown = null, message = `Request failed with status ${status}`) {
    super(AppErrorCode.NETWORK_ERROR, message);
  }
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
        throw new HttpStatusError(response.status, await response.json().catch(() => null));
      }

      if (response.status === 204) {
        return undefined as T;
      }

      // Writes may answer 200/201 with an empty body.
      if (init.method === 'PUT' || init.method === 'DELETE') {
        const text = await response.text();

        return (text ? JSON.parse(text) : undefined) as T;
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
