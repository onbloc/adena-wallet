import '../../../../src/infrastructure/ai/polyfills';

import { waitFor } from '@testing-library/react-native';
import BlobUtil from 'react-native-blob-util';

jest.mock('react-native-blob-util', () => {
  const fetch = jest.fn();

  return { __esModule: true, default: { fetch, config: jest.fn(() => ({ fetch })) } };
});

import { createStreamingFetch } from '../../../../src/infrastructure/ai/streaming-fetch';

class FakeXhr {
  static last: FakeXhr;

  responseText = '';
  status = 200;
  statusText = 'OK';
  responseURL = '';
  readyState = 0;
  responseType = '';
  method = '';
  url = '';
  sent: unknown;
  aborted = false;
  requestHeaders: Record<string, string> = {};
  onreadystatechange: (() => void) | null = null;
  onprogress: (() => void) | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXhr.last = this;
  }

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string): void {
    this.requestHeaders[name] = value;
  }

  getAllResponseHeaders(): string {
    return 'Content-Type: text/event-stream\r\nX-Request-Id: abc\r\n';
  }

  send(body: unknown): void {
    this.sent = body;
  }

  abort(): void {
    this.aborted = true;
    this.onabort?.();
  }

  headers(): void {
    this.readyState = 2;
    this.onreadystatechange?.();
  }

  chunk(text: string): void {
    this.responseText += text;
    this.onprogress?.();
  }

  finish(): void {
    this.readyState = 4;
    this.onload?.();
  }
}

const streamingFetch = createStreamingFetch(() => new FakeXhr() as unknown as XMLHttpRequest);

async function drain(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = '';

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      return text + decoder.decode();
    }

    text += decoder.decode(value, { stream: true });
  }
}

describe('createStreamingFetch', () => {
  it('sends method, headers and string body, and resolves once headers arrive', async () => {
    const pending = streamingFetch('https://api.test/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer k' },
      body: '{"a":1}',
    });

    FakeXhr.last.headers();
    const response = await pending;

    expect(FakeXhr.last.method).toBe('POST');
    expect(FakeXhr.last.url).toBe('https://api.test/v1/responses');
    expect(FakeXhr.last.requestHeaders).toMatchObject({ authorization: 'Bearer k', 'content-type': 'application/json' });
    expect(FakeXhr.last.sent).toBe('{"a":1}');
    expect(response.ok).toBe(true);
    expect(response.headers.get('x-request-id')).toBe('abc');
    FakeXhr.last.finish();
  });

  it('streams incremental text as bytes and closes on load', async () => {
    const pending = streamingFetch('https://api.test/stream');

    FakeXhr.last.headers();
    const response = await pending;
    const xhr = FakeXhr.last;
    const result = drain(response);

    xhr.chunk('data: 한');
    xhr.chunk('글\n\n');
    xhr.finish();

    await expect(result).resolves.toBe('data: 한글\n\n');
  });

  it('holds back a split surrogate pair until its second half arrives', async () => {
    const pending = streamingFetch('https://api.test/stream');

    FakeXhr.last.headers();
    const response = await pending;
    const xhr = FakeXhr.last;
    const result = drain(response);
    const emoji = '🙂';

    xhr.chunk(`a${emoji[0]}`);
    xhr.chunk(emoji[1]);
    xhr.finish();

    await expect(result).resolves.toBe(`a${emoji}`);
  });

  it('reads an error body as text with its status', async () => {
    const pending = streamingFetch('https://api.test/fail');

    FakeXhr.last.status = 401;
    FakeXhr.last.statusText = 'Unauthorized';
    FakeXhr.last.headers();
    FakeXhr.last.chunk('{"error":"bad key"}');
    FakeXhr.last.finish();
    const response = await pending;

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'bad key' });
  });

  it('rejects before any response when the network fails', async () => {
    const pending = streamingFetch('https://api.test/down');

    FakeXhr.last.onerror?.();

    await expect(pending).rejects.toThrow('Network request failed');
  });

  it('errors the body stream when the network fails mid-response', async () => {
    const pending = streamingFetch('https://api.test/stream');

    FakeXhr.last.headers();
    const response = await pending;
    const result = drain(response);

    FakeXhr.last.onerror?.();

    await expect(result).rejects.toThrow('Network request failed');
  });

  it('aborts the request and rejects with an AbortError', async () => {
    const controller = new AbortController();
    const pending = streamingFetch('https://api.test/stream', { signal: controller.signal as unknown as RequestInit['signal'] });
    const xhr = FakeXhr.last;

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(xhr.aborted).toBe(true);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();

    controller.abort();

    await expect(streamingFetch('https://api.test/x', { signal: controller.signal as unknown as RequestInit['signal'] })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('cancels the request when the reader cancels the body', async () => {
    const pending = streamingFetch('https://api.test/stream');
    const xhr = FakeXhr.last;

    xhr.headers();
    const response = await pending;

    await response.body!.cancel();

    expect(xhr.aborted).toBe(true);
  });

  it('refuses non-string bodies instead of sending them wrongly', async () => {
    await expect(streamingFetch('https://api.test/x', { method: 'POST', body: new Uint8Array([1]) as unknown as RequestInit['body'] })).rejects.toThrow(TypeError);
  });

  it('ignores late load/progress events after an error', async () => {
    const pending = streamingFetch('https://api.test/stream');
    const xhr = FakeXhr.last;

    xhr.headers();
    const response = await pending;
    const result = drain(response);

    xhr.onerror?.();
    expect(() => {
      xhr.chunk('late');
      xhr.finish();
      xhr.onabort?.();
    }).not.toThrow();
    await expect(result).rejects.toThrow('Network request failed');
  });

  it('does not abort or error a successfully closed response', async () => {
    const controller = new AbortController();
    const pending = streamingFetch('https://api.test/stream', { signal: controller.signal as unknown as RequestInit['signal'] });
    const xhr = FakeXhr.last;

    xhr.chunk('complete');
    xhr.finish();
    const response = await pending;

    controller.abort();
    xhr.onerror?.();
    await expect(response.text()).resolves.toBe('complete');
    expect(xhr.aborted).toBe(false);
  });

  it('errors the stream once when cancellation races native abort and load', async () => {
    const controller = new AbortController();
    const pending = streamingFetch('https://api.test/stream', { signal: controller.signal as unknown as RequestInit['signal'] });
    const xhr = FakeXhr.last;

    xhr.headers();
    const response = await pending;
    const result = drain(response);

    controller.abort();
    expect(() => xhr.finish()).not.toThrow();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('consumes a Request body and inherits its headers and signal', async () => {
    const controller = new AbortController();
    const request = new Request('https://api.test/post', {
      method: 'POST', body: 'payload', headers: { 'x-test': 'inherited' }, signal: controller.signal,
    });
    const pending = streamingFetch(request as unknown as RequestInfo);

    await waitFor(() => expect(FakeXhr.last.sent).toBe('payload'));
    const xhr = FakeXhr.last;

    expect(xhr.sent).toBe('payload');
    expect(xhr.requestHeaders['x-test']).toBe('inherited');
    expect(request.bodyUsed).toBe(true);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('refuses an already consumed Request body', async () => {
    const request = new Request('https://api.test/post', { method: 'POST', body: 'payload' });

    await request.text();
    await expect(streamingFetch(request as unknown as RequestInfo)).rejects.toThrow('Body has already been consumed');
  });

  it('tracks direct reader consumption and clones without consuming the original', async () => {
    const pending = streamingFetch('https://api.test/stream');

    FakeXhr.last.chunk('text');
    FakeXhr.last.finish();
    const response = await pending;
    const cloned = response.clone();

    await expect(cloned.text()).resolves.toBe('text');
    expect(response.bodyUsed).toBe(false);
    const reader = response.body!.getReader();

    await reader.read();
    expect(response.bodyUsed).toBe(true);
    reader.releaseLock();
    await expect(response.text()).rejects.toThrow('Body has already been consumed');
  });

  it('uses a null body for HEAD and no-content responses', async () => {
    const pending = streamingFetch('https://api.test/empty', { method: 'HEAD' });

    FakeXhr.last.finish();
    const response = await pending;

    expect(response.body).toBeNull();
    await expect(response.text()).resolves.toBe('');
  });

  it('rejects GET bodies before starting a request', async () => {
    await expect(streamingFetch('https://api.test/x', { body: 'wrong' })).rejects.toThrow('cannot have a body');
  });

  it('exposes manual redirect status and Location without following the target', async () => {
    const task = Object.assign(Promise.resolve({
      info: () => ({ status: 307, headers: { location: 'http://127.0.0.1/private' }, redirects: ['https://mcp.test'] }),
      text: () => '',
    }), { cancel: jest.fn() });

    jest.mocked(BlobUtil.fetch).mockReturnValueOnce(task as never);
    const response = await streamingFetch('https://mcp.test', { redirect: 'manual' });

    expect(response.status).toBe(307);
    expect(response.redirected).toBe(false);
    expect(response.headers.get('location')).toBe('http://127.0.0.1/private');
    expect(BlobUtil.config).toHaveBeenCalledWith({ followRedirect: false });
  });

  it.each([301, 302, 303, 307, 308])('blocks redirect %s in native transport without following it', async (status) => {
    const text = jest.fn();
    const task = Object.assign(Promise.resolve({
      info: () => ({ status, headers: { location: 'http://127.0.0.1/private' }, redirects: ['https://mcp.test'] }), text,
    }), { cancel: jest.fn() });

    jest.mocked(BlobUtil.fetch).mockReturnValueOnce(task as never);
    await expect(streamingFetch('https://mcp.test', { redirect: 'error' })).rejects.toThrow('Redirects are not allowed');
    expect(BlobUtil.config).toHaveBeenCalledWith({ followRedirect: false });
    expect(text).not.toHaveBeenCalled();
  });

  it('accepts a native response whose redirect metadata contains only the original URL', async () => {
    const task = Object.assign(Promise.resolve({
      info: () => ({ status: 200, headers: { 'content-type': 'application/json' }, redirects: ['https://mcp.test'] }),
      text: () => '{"result":true}',
    }), { cancel: jest.fn() });

    jest.mocked(BlobUtil.fetch).mockReturnValueOnce(task as never);
    const response = await streamingFetch('https://mcp.test', { redirect: 'error', method: 'POST', body: '{}' });

    await expect(response.json()).resolves.toEqual({ result: true });
  });

  it('cancels a restricted native request promptly even when native completion is stalled', async () => {
    const task = Object.assign(new Promise<never>(() => {}), { cancel: jest.fn() });

    jest.mocked(BlobUtil.fetch).mockReturnValueOnce(task as never);
    const controller = new AbortController();
    const pending = streamingFetch('https://mcp.test', { redirect: 'error', signal: controller.signal as unknown as RequestInit['signal'] });

    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(task.cancel).toHaveBeenCalledTimes(1);
  });
});
