import { NavigationContext, StackActions } from '@react-navigation/native';
import React, { PropsWithChildren, ReactElement, use, useEffect, useId, useLayoutEffect, useRef } from 'react';

import { SheetFrame } from './sheet-frame';
import { SHEET_ROUTE } from './sheet-screen';
import { sheetStore } from './sheet-store';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  dismissible?: boolean;
  // Runs once the sheet is fully gone, e.g. before presenting a system picker.
  onDismissed?: () => void;
  // Runs as the sheet starts to present; a field focused here brings the keyboard up with the sheet.
  onWillOpen?: () => void;
  // Runs once the sheet has settled.
  onOpened?: () => void;
}

// Native sheet exit takes ~300 ms on Android and a little longer on iOS; neither reports its end to JS.
export const SHEET_EXIT_MS = 450;

type Navigation = NonNullable<React.ContextType<typeof NavigationContext>>;

// The nearest navigator (own or parent) that registers the sheet route.
const canPresent = (navigation: Navigation | undefined): navigation is Navigation => {
  for (let current: Navigation | undefined = navigation; current; current = current.getParent()) {
    if (current.getState()?.routeNames?.includes(SHEET_ROUTE)) {
      return true;
    }
  }

  return false;
};

type NativeBottomSheetProps = PropsWithChildren<BottomSheetProps> & { navigation: Navigation };

// Describes the sheet to the store; the sheet route renders it as a native form sheet.
const NativeBottomSheet = (props: NativeBottomSheetProps): null => {
  const { visible, title, description, onClose, dismissible = true, navigation, children } = props;
  const id = useId();
  const latestRef = useRef(props);
  const mountedRef = useRef(true);
  const dismissedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const representTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const presentRef = useRef((): void => navigation.dispatch(StackActions.push(SHEET_ROUTE, { id })));

  useLayoutEffect(() => {
    latestRef.current = props;
    presentRef.current = (): void => navigation.dispatch(StackActions.push(SHEET_ROUTE, { id }));
    sheetStore.setOwner(id, {
      content: { title, description, dismissible, onClose, children },
      onWillOpen: () => latestRef.current.onWillOpen?.(),
      onOpened: () => latestRef.current.onOpened?.(),
      onRemoved: (requested) => {
        const latest = latestRef.current;

        // Android cannot block the drag or the scrim natively, so a sheet that must stay comes back.
        if (!requested && latest.visible && latest.dismissible === false) {
          representTimerRef.current = setTimeout(() => mountedRef.current && sheetStore.requestOpen(id, () => presentRef.current()), 0);
          return;
        }

        if (!requested) {
          latest.onClose();
        }

        clearTimeout(dismissedTimerRef.current);
        dismissedTimerRef.current = setTimeout(() => latestRef.current.onDismissed?.(), SHEET_EXIT_MS);
      },
    });
  });

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      clearTimeout(dismissedTimerRef.current);
      clearTimeout(representTimerRef.current);
      sheetStore.releaseOwner(id);
    };
  }, [id]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    sheetStore.requestOpen(id, () => presentRef.current());

    return (): void => sheetStore.requestClose(id);
  }, [id, visible]);

  return null;
};

// Without a navigator that hosts sheets (Storybook, isolated renders) the content shows in place.
const InlineBottomSheet = ({ visible, title, description, onClose, dismissible = true, onDismissed, onOpened, children }: PropsWithChildren<BottomSheetProps>): ReactElement | null => {
  const callbacksRef = useRef({ onDismissed, onOpened });
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    callbacksRef.current = { onDismissed, onOpened };
  });

  // Settles at once; `onDismissed` keeps the native sheet's timing so callers see the same order.
  useEffect(() => {
    const wasVisible = wasVisibleRef.current;

    wasVisibleRef.current = visible;

    if (visible) {
      callbacksRef.current.onOpened?.();
      return;
    }

    if (!wasVisible) {
      return;
    }

    const timer = setTimeout(() => callbacksRef.current.onDismissed?.(), SHEET_EXIT_MS);

    return (): void => clearTimeout(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return <SheetFrame title={title} description={description} onClose={dismissible ? onClose : undefined}>{children}</SheetFrame>;
};

// Declarative native sheet: while `visible`, the content is presented through the stack's sheet route.
export const BottomSheet = (props: PropsWithChildren<BottomSheetProps>): ReactElement | null => {
  const navigation = use(NavigationContext);

  if (canPresent(navigation)) {
    return <NativeBottomSheet {...props} navigation={navigation} />;
  }

  return <InlineBottomSheet {...props} />;
};
