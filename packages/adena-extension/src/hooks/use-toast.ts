import { CommonState } from '@states';
import { useEffect } from 'react';
import { useAtom } from 'jotai';

export type UseToastReturn = {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
};

export const useToast = (): UseToastReturn => {
  const [message, setMessage] = useAtom(CommonState.toastMessage);

  const show = (message: string): void => {
    setMessage(message);
  };

  const clear = (): void => {
    setMessage(null);
  };

  useEffect(() => {
    setMessage(null);
  }, []);

  return {
    message,
    show,
    clear,
  };
};
