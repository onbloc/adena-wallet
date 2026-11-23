import { HttpClient, HttpRequest } from '../../src/infrastructure/http/http-client';

type Responder = unknown | ((init?: HttpRequest) => unknown);

// Route table keyed by exact URL; unknown URLs fail like a 404.
export class FakeHttpClient implements HttpClient {
  readonly calls: string[] = [];
  private readonly routes = new Map<string, Responder>();

  on(url: string, response: Responder): this {
    this.routes.set(url, response);
    return this;
  }

  async request<T>(url: string, init?: HttpRequest): Promise<T> {
    this.calls.push(url);

    if (!this.routes.has(url)) {
      throw new Error(`404 ${url}`);
    }

    const responder = this.routes.get(url);

    return (typeof responder === 'function' ? (responder as (i?: HttpRequest) => unknown)(init) : responder) as T;
  }
}
