import type BlobUtil from 'react-native-blob-util';

// XHR supplies incremental UTF-8 text; restricted redirects use the native transport instead.
const HEADERS_RECEIVED = 2;

type CreateXhr = () => XMLHttpRequest;
type RestrictedFetch = (url: string, init: RequestInit) => Promise<Response>;

class StreamingResponse {
  readonly ok: boolean;
  readonly type = 'basic';
  private consumed = false;
  body: ReadableStream<Uint8Array> | null;

  constructor(
    private source: ReadableStream<Uint8Array> | null,
    readonly status: number,
    readonly statusText: string,
    readonly url: string,
    readonly headers: Headers,
    readonly redirected = false,
  ) {
    this.ok = status >= 200 && status < 300;
    this.body = this.trackBody(source);
  }

  private trackBody(source: ReadableStream<Uint8Array> | null): ReadableStream<Uint8Array> | null {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    return source === null
      ? null
      : new ReadableStream<Uint8Array>({
          pull: async (controller): Promise<void> => {
            this.consumed = true;
            reader ??= source.getReader();

            try {
              const { done, value } = await reader.read();

              if (done) {
                controller.close();
              }
              else {
                controller.enqueue(value);
              }
            }
            catch (error) {
              controller.error(error);
            }
          },
          cancel: async (reason): Promise<void> => {
            this.consumed = true;

            if (reader) {
              await reader.cancel(reason);
            }
            else {
              await source.cancel(reason);
            }
          },
        }, { highWaterMark: 0 });
  }

  get bodyUsed(): boolean {
    return this.consumed;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const bytes = await this.readAll();

    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(await this.readAll());
  }

  async json(): Promise<unknown> {
    return JSON.parse(await this.text());
  }

  clone(): StreamingResponse {
    if (this.bodyUsed || this.body?.locked) {
      throw new TypeError('Body has already been consumed');
    }

    const branches = this.source?.tee();

    this.source = branches?.[0] ?? null;
    this.body = this.trackBody(this.source);
    return new StreamingResponse(branches?.[1] ?? null, this.status, this.statusText, this.url, new Headers(this.headers), this.redirected);
  }

  private async readAll(): Promise<Uint8Array> {
    if (this.bodyUsed || this.body?.locked) {
      throw new TypeError('Body has already been consumed');
    }

    if (!this.body) {
      return new Uint8Array();
    }

    this.consumed = true;
    const reader = this.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;

    try {
      for (;;) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value);
        length += value.length;
      }
    }
    finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(length);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }

    return bytes;
  }
}

function abortError(): Error {
  const error = new Error('The operation was aborted');

  error.name = 'AbortError';
  return error;
}

function parseHeaders(raw: string): Headers {
  const headers = new Headers();

  for (const line of raw.trim().split(/[\r\n]+/)) {
    const separator = line.indexOf(':');

    if (separator > 0) {
      headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
  }

  return headers;
}

// MCP uses redirect:error as an SSRF boundary. XHR follows redirects before JS can inspect them.
const fetchWithoutRedirects: RestrictedFetch = async (url, init) => {
  const signal = init.signal;

  if (signal?.aborted) {
    throw abortError();
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Initialize native transport only when an MCP request needs it.
  const nativeModule: { default: typeof BlobUtil } = require('react-native-blob-util');
  const headers: Record<string, string> = {};

  new Headers(init.headers).forEach((value, name) => {
    headers[name] = value;
  });
  const task = nativeModule.default.config({ followRedirect: false }).fetch(
    (init.method ?? 'GET') as Parameters<typeof BlobUtil.fetch>[0],
    url,
    headers,
    init.body ?? undefined,
  );
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = (): void => {
      reject(abortError());
      // The native API rejects the task itself and returns void despite its declaration.
      task.cancel();
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    if (signal?.aborted) {
      onAbort();
    }
  });

  try {
    const response = await Promise.race([task, aborted]);
    const { status, headers: responseHeaders, redirects } = response.info();

    if (status === 0) {
      throw new TypeError('Network request failed');
    }

    if (redirects.length > 1 || (init.redirect === 'error' && [301, 302, 303, 307, 308].includes(status))) {
      throw new TypeError('Redirects are not allowed');
    }

    const text = await Promise.race([Promise.resolve(response.text()), aborted]);
    const bytes = new TextEncoder().encode(text);
    const body = init.method === 'HEAD' || [204, 205, 304].includes(status)
      ? null
      : new ReadableStream<Uint8Array>({
          start(controller): void {
            controller.enqueue(bytes);
            controller.close();
          },
        });

    return new StreamingResponse(body, status, '', url, new Headers(responseHeaders as Record<string, string>)) as unknown as Response;
  }
  finally {
    if (onAbort) {
      signal?.removeEventListener('abort', onAbort);
    }
  }
};

export function createStreamingFetch(
  createXhr: CreateXhr = () => new XMLHttpRequest(),
  restrictedFetch: RestrictedFetch = fetchWithoutRedirects,
): typeof fetch {
  const send = (url: string, init: RequestInit): Promise<Response> => {
    const method = (init.method ?? 'GET').toUpperCase();
    const signal = init.signal;
    const body = init.body;

    if (signal?.aborted) {
      return Promise.reject(abortError());
    }

    if (body != null && typeof body !== 'string') {
      return Promise.reject(new TypeError('The streaming fetch only sends string bodies'));
    }

    if ((method === 'GET' || method === 'HEAD') && body != null) {
      return Promise.reject(new TypeError('GET and HEAD requests cannot have a body'));
    }

    if (init.redirect === 'error' || init.redirect === 'manual') {
      return restrictedFetch(url, { ...init, method });
    }

    return new Promise<Response>((resolve, reject) => {
      const xhr = createXhr();
      const encoder = new TextEncoder();
      let controller: ReadableStreamDefaultController<Uint8Array>;
      let received = 0;
      let responded = false;
      let terminal = false;
      const body$ = new ReadableStream<Uint8Array>({
        start(streamController): void { controller = streamController; },
        cancel(): void {
          if (!terminal) {
            terminal = true;
            signal?.removeEventListener('abort', onAbort);
            xhr.abort();
          }
        },
      });
      const fail = (error: Error): void => {
        if (terminal) {
          return;
        }

        terminal = true;
        signal?.removeEventListener('abort', onAbort);

        if (responded) {
          controller.error(error);
        }
        else {
          reject(error);
        }
      };
      const onAbort = (): void => {
        fail(abortError());
        xhr.abort();
      };
      const flush = (final: boolean): void => {
        if (terminal || method === 'HEAD' || [204, 205, 304].includes(xhr.status)) {
          return;
        }

        const text = xhr.responseText ?? '';
        let end = text.length;

        if (!final && end > received) {
          const last = text.charCodeAt(end - 1);

          if (last >= 0xd800 && last <= 0xdbff) {
            end--;
          }
        }

        if (end > received) {
          controller.enqueue(encoder.encode(text.slice(received, end)));
          received = end;
        }
      };
      const respond = (): void => {
        if (responded || terminal) {
          return;
        }

        if (xhr.status === 0) {
          return;
        }

        responded = true;
        const noBody = method === 'HEAD' || [204, 205, 304].includes(xhr.status);
        const responseUrl = xhr.responseURL || url;

        resolve(new StreamingResponse(noBody ? null : body$, xhr.status, xhr.statusText, responseUrl,
          parseHeaders(xhr.getAllResponseHeaders() ?? ''), responseUrl !== url) as unknown as Response);
      };

      try {
        xhr.open(method, url);
        xhr.responseType = 'text';
        xhr.withCredentials = init.credentials === 'include';
        new Headers(init.headers).forEach((value, name) => xhr.setRequestHeader(name, value));
        xhr.onreadystatechange = (): void => {
          if (xhr.readyState === HEADERS_RECEIVED) {
            respond();
          }
        };

        xhr.onprogress = (): void => {
          respond();
          flush(false);
        };

        xhr.onload = (): void => {
          if (terminal) {
            return;
          }

          respond();

          if (!responded) {
            fail(new TypeError('Network request failed'));
            return;
          }

          flush(true);
          terminal = true;
          signal?.removeEventListener('abort', onAbort);
          controller.close();
        };

        xhr.onerror = (): void => fail(new TypeError('Network request failed'));
        xhr.ontimeout = (): void => fail(new TypeError('Network request timed out'));
        xhr.onabort = (): void => fail(abortError());
        signal?.addEventListener('abort', onAbort, { once: true });

        if (signal?.aborted) {
          onAbort();
        }
        else {
          xhr.send(body ?? null);
        }
      }
      catch (error) {
        fail(error instanceof Error ? error : new TypeError('Network request failed'));
      }
    });
  };

  return (input, init = {}): Promise<Response> => {
    if (typeof input === 'object' && 'url' in input) {
      const request = input as Request;
      const merged: RequestInit = {
        method: request.method,
        headers: request.headers,
        signal: request.signal,
        redirect: request.redirect,
        credentials: request.credentials,
        ...init,
      };

      // Request bodies must be consumed, not silently omitted. init.body overrides the request body.
      if (init.body == null && (request.body != null || !['GET', 'HEAD'].includes(request.method.toUpperCase()))) {
        if (request.bodyUsed) {
          return Promise.reject(new TypeError('Body has already been consumed'));
        }

        return request.text().then(body => send(request.url, { ...merged, body }));
      }

      return send(request.url, merged);
    }

    return send(String(input), init);
  };
}

export const streamingFetch = createStreamingFetch();
