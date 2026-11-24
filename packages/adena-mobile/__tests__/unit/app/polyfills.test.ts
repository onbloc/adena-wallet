jest.mock('react-native-get-random-values', () => ({}));

describe('polyfills', () => {
  const scope = globalThis as unknown as Record<string, unknown>;
  const original = { Buffer: scope.Buffer, TextDecoder: scope.TextDecoder };

  afterEach(() => {
    scope.Buffer = original.Buffer;
    scope.TextDecoder = original.TextDecoder;
  });

  it('installs Buffer and TextDecoder when missing', () => {
    delete scope.Buffer;
    delete scope.TextDecoder;
    jest.isolateModules(() => {
      jest.requireActual('../../../src/app/polyfills');
    });
    expect((scope.Buffer as { from: unknown }).from).toEqual(expect.any(Function));
    expect(scope.TextDecoder).toHaveProperty('name', 'Utf8TextDecoder');
  });

  it('keeps existing globals', () => {
    const existing = { Buffer: jest.fn(), TextDecoder: jest.fn() };

    scope.Buffer = existing.Buffer;
    scope.TextDecoder = existing.TextDecoder;
    jest.isolateModules(() => {
      jest.requireActual('../../../src/app/polyfills');
    });
    expect(scope.Buffer).toBe(existing.Buffer);
    expect(scope.TextDecoder).toBe(existing.TextDecoder);
  });
});
