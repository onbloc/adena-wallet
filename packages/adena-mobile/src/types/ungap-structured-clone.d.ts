declare module '@ungap/structured-clone' {
  export default function structuredClone<T>(value: T, options?: { transfer?: unknown[]; json?: boolean; lossy?: boolean }): T;
}
