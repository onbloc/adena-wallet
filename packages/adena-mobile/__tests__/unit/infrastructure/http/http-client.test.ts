import { HTTP_TIMEOUT_MS } from '../../../../src/config/endpoints';
import { isAppError } from '../../../../src/core/errors';
import { FetchHttpClient, HttpStatusError } from '../../../../src/infrastructure/http/http-client';

const jsonResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => body,
});

const capture = async (promise: Promise<unknown>): Promise<unknown> => promise.then(() => undefined, error => error);

describe('FetchHttpClient', () => {
  const client = new FetchHttpClient();
  const originalFetch = globalThis.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('issues a GET with JSON accept header by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await expect(client.request('https://x/a')).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe('https://x/a');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ Accept: 'application/json' });
    expect('body' in init).toBe(false);
    expect(init.signal).toBeDefined();
  });

  it('serializes a body with content type and merges custom headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await client.request('https://x', { method: 'POST', body: { a: 1 }, headers: { 'X-Key': 'k', Accept: 'text/plain' } });
    const [, init] = fetchMock.mock.calls[0];

    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toEqual({ Accept: 'text/plain', 'Content-Type': 'application/json', 'X-Key': 'k' });
  });

  it('sends falsy-but-defined bodies without a content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await client.request('https://x', { method: 'POST', body: 0 });
    const [, init] = fetchMock.mock.calls[0];

    expect(init.body).toBe('0');
    expect(init.headers).toEqual({ Accept: 'application/json' });
  });

  it.each([404, 500, 302])('maps status %i to NETWORK_ERROR', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status }));
    const error = await capture(client.request('https://x'));

    expect(isAppError(error, 'NETWORK_ERROR')).toBe(true);
    expect((error as Error).message).toBe(`Request failed with status ${status}`);
  });

  it('keeps the status and parsed error body, or null when the body is not JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 5, message: 'not found' }, { ok: false, status: 404 }));
    const error = await capture(client.request('https://x'));

    expect(error).toBeInstanceOf(HttpStatusError);
    expect(error).toMatchObject({ status: 404, body: { code: 5, message: 'not found' } });

    const notJson = async (): Promise<never> => {
      throw new SyntaxError('Unexpected token <');
    };

    fetchMock.mockResolvedValue({ ok: false, status: 503, json: notJson });
    expect(await capture(client.request('https://x'))).toMatchObject({ status: 503, body: null, message: 'Request failed with status 503' });
  });

  it('maps invalid JSON to NETWORK_ERROR with the parser cause', async () => {
    const cause = new SyntaxError('Unexpected token <');

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw cause;
      },
    });
    const error = await capture(client.request('https://x'));

    expect(isAppError(error, 'NETWORK_ERROR')).toBe(true);
    expect((error as Error).message).toBe('Unexpected token <');
    expect((error as { cause?: unknown }).cause).toBe(cause);
  });

  it('falls back to a generic message for non-Error rejections', async () => {
    fetchMock.mockRejectedValueOnce(undefined);
    expect((await capture(client.request('https://x')) as Error).message).toBe('Network request failed');
    fetchMock.mockRejectedValueOnce({});
    expect(isAppError(await capture(client.request('https://x')), 'NETWORK_ERROR')).toBe(true);
  });

  it('aborts after the configured timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_url: string, init: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
    }));
    const pending = capture(client.request('https://x', { timeoutMs: 50 }));

    jest.advanceTimersByTime(49);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    const error = await pending;

    expect(isAppError(error, 'NETWORK_ERROR')).toBe(true);
    expect((error as Error).message).toBe('Aborted');
  });

  it('uses the default timeout and clears the timer on completion', async () => {
    jest.useFakeTimers();
    const setSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearSpy = jest.spyOn(globalThis, 'clearTimeout');

    fetchMock.mockResolvedValue(jsonResponse({}));
    await client.request('https://x');
    expect(setSpy).toHaveBeenCalledWith(expect.any(Function), HTTP_TIMEOUT_MS);
    expect(clearSpy).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    setSpy.mockRestore();
    clearSpy.mockRestore();
  });
});
