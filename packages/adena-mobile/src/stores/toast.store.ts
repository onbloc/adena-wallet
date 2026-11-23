import { create } from 'zustand';

import { StatusTone } from '../theme/colors';

export interface ToastMessage {
  id: number;
  tone: StatusTone;
  message: string;
}

interface ToastState {
  toast: ToastMessage | null;
  show: (message: string, tone?: StatusTone) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>(set => ({
  toast: null,
  show: (message, tone = 'info'): void => set({ toast: { id: nextId++, tone, message } }),
  dismiss: (): void => set({ toast: null }),
}));
