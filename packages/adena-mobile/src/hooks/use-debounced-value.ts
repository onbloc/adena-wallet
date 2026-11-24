import { useEffect, useState } from 'react';

// Follows `value` once it stops changing for `delayMs`; an empty string applies immediately.
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  // Reset during render so retyping right after clearing never revives the previous value.
  if (value === '' && debounced !== value) {
    setDebounced(value);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    return (): void => clearTimeout(timer);
  }, [delayMs, value]);

  return value === '' ? value : debounced;
};
