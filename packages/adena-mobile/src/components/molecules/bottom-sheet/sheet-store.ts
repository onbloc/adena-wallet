import { ReactNode } from 'react';
import { Keyboard } from 'react-native';

export interface SheetContent {
  title: string;
  description?: string;
  dismissible: boolean;
  onClose: () => void;
  children?: ReactNode;
}

// What a BottomSheet hands to the route that presents it.
export interface SheetOwner {
  content: SheetContent;
  onWillOpen: () => void;
  onOpened: () => void;
  // `requested` is false when the user dismissed the sheet natively (swipe, scrim or back).
  onRemoved: (requested: boolean) => void;
}

interface Presented {
  id: string;
  closing: boolean;
  dismiss?: () => void;
}

interface Request {
  id: string;
  present: () => void;
}

const owners = new Map<string, SheetOwner>();
const listeners = new Map<string, Set<() => void>>();
// Owners that unmounted while their sheet was still on screen; kept until the route leaves.
const orphans = new Set<string>();
let presented: Presented | null = null;
let queue: Request[] = [];

const notify = (id: string): void => listeners.get(id)?.forEach(listener => listener());

const flush = (): void => {
  const next = presented ? undefined : queue.shift();

  if (next) {
    presented = { id: next.id, closing: false };
    next.present();
  }
};

const forget = (id: string): void => {
  owners.delete(id);
  orphans.delete(id);
  notify(id);
};

// One native sheet at a time: a sheet requested while another is up presents once that one is gone.
export const sheetStore = {
  setOwner: (id: string, owner: SheetOwner): void => {
    owners.set(id, owner);
    notify(id);
  },

  releaseOwner: (id: string): void => {
    queue = queue.filter(request => request.id !== id);

    if (presented?.id !== id) {
      forget(id);
      return;
    }

    if (presented.dismiss) {
      orphans.add(id);
      sheetStore.requestClose(id);
      return;
    }

    // Pushed but not mounted yet: the route dismisses itself when it finds no presentation.
    presented = null;
    forget(id);
    flush();
  },

  getOwner: (id: string): SheetOwner | undefined => owners.get(id),

  getContent: (id: string): SheetContent | undefined => owners.get(id)?.content,

  subscribe: (id: string, listener: () => void): (() => void) => {
    const set = listeners.get(id) ?? new Set();

    set.add(listener);
    listeners.set(id, set);

    return (): void => {
      set.delete(listener);

      if (set.size === 0) {
        listeners.delete(id);
      }
    };
  },

  requestOpen: (id: string, present: () => void): void => {
    if ((presented?.id === id && !presented.closing) || queue.some(request => request.id === id)) {
      return;
    }

    queue.push({ id, present });
    flush();
  },

  requestClose: (id: string): void => {
    queue = queue.filter(request => request.id !== id);

    if (presented?.id !== id || presented.closing) {
      return;
    }

    presented.closing = true;

    // Only the sheet's own field can hold focus while it is on top.
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    }

    presented.dismiss?.();
  },

  isClosing: (id: string): boolean => presented?.id === id && presented.closing,

  // Called by the sheet route on mount; the returned function runs once the route is removed.
  attach: (id: string, dismiss: () => void): (() => void) => {
    if (presented?.id !== id) {
      dismiss();
      return () => undefined;
    }

    const current = presented;

    current.dismiss = dismiss;

    if (current.closing) {
      dismiss();
    }

    return (): void => {
      if (presented !== current) {
        return;
      }

      presented = null;
      const owner = owners.get(id);

      if (orphans.has(id)) {
        forget(id);
      }

      owner?.onRemoved(current.closing);
      flush();
    };
  },
};

// Test-only: drops every pending and presented sheet.
export const resetSheetStore = (): void => {
  owners.clear();
  orphans.clear();
  presented = null;
  queue = [];
};
