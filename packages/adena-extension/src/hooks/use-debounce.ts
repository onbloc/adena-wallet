import { useEffect, useState } from 'react';

interface UseDebounceReturn<T> {
  debouncedValue: T;
  setDebouncedValue: React.Dispatch<React.SetStateAction<T>>;
  isLoading: boolean;
}

export const useDebounce = <T>(value: T, delay: number): UseDebounceReturn<T> => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const handler = setTimeout(() => {
      setIsLoading(false);
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value or delay changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return { debouncedValue, setDebouncedValue, isLoading };
};
