import '@testing-library/jest-dom/vitest';
import './src/common/config/bignumber';

// jsdom does not implement ResizeObserver. Components such as the main token
// balance auto-shrink construct one on mount, so provide a no-op shim.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
