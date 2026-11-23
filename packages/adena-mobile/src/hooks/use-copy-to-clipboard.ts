import Clipboard from '@react-native-clipboard/clipboard';
import { useCallback } from 'react';

import { useToastStore } from '../stores/toast.store';

export type CopyToClipboard = (value: string, message?: string) => void;

export const useCopyToClipboard = (): CopyToClipboard => {
  const showToast = useToastStore(state => state.show);

  return useCallback((value: string, message = 'Address copied') => {
    Clipboard.setString(value);
    showToast(message, 'success');
  }, [showToast]);
};
