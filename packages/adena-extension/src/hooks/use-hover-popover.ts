import { useCallback, useEffect, useRef, useState } from 'react';

interface UseHoverPopoverOptions {
  closeDelayMs?: number;
}

interface UseHoverPopover<T extends HTMLElement> {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorRef: React.MutableRefObject<T | null>;
  cancelClose: () => void;
  scheduleClose: () => void;
  onAnchorMouseEnter: () => void;
  onAnchorMouseLeave: () => void;
  onPopoverMouseEnter: () => void;
  onPopoverMouseLeave: () => void;
}

// Hover-driven popover state machine shared by the header anchors. Open on
// anchor mouseenter, close after `closeDelayMs` of unattended mouseleave so the
// pointer can travel into the popover, and close immediately on Esc.
export const useHoverPopover = <T extends HTMLElement = HTMLButtonElement>(
  { closeDelayMs = 120 }: UseHoverPopoverOptions = {},
): UseHoverPopover<T> => {
  const anchorRef = useRef<T | null>(null);
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), closeDelayMs);
  }, [closeDelayMs]);

  const onAnchorMouseEnter = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const onAnchorMouseLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return (): void => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return {
    open,
    setOpen,
    anchorRef,
    cancelClose,
    scheduleClose,
    onAnchorMouseEnter,
    onAnchorMouseLeave,
    onPopoverMouseEnter: cancelClose,
    onPopoverMouseLeave: scheduleClose,
  };
};
