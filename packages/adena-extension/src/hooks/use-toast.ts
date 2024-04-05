import { CommonState } from '@states';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';

export type UseToastReturn = {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
};

export const useToast = (): UseToastReturn => {
  const [message, setMessage] = useRecoilState(CommonState.toastMessage);

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
