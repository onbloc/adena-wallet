import { NavigationState, ParamListBase, StackActions } from '@react-navigation/native';
import { NativeStackNavigationOptions, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { radius, useThemeColors } from '../../../theme';
import { SheetFrame } from './sheet-frame';
import { sheetStore } from './sheet-store';

export const SHEET_ROUTE = 'Sheet';

export interface SheetRouteParams {
  id: string;
}

// `fitToContents` needs iOS 16; iOS 15 falls back to the large detent so no content is cut off.
const LEGACY_IOS = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) < 16;
const SHEET_DETENTS: NativeStackNavigationOptions['sheetAllowedDetents'] = LEGACY_IOS ? [1] : 'fitToContents';

// Native sheet presentation: UISheetPresentationController on iOS, Material bottom sheet on Android.
export const useSheetScreenOptions = (): NativeStackNavigationOptions => {
  const surface = useThemeColors().background.surface;

  return useMemo(() => ({
    headerShown: false,
    presentation: 'formSheet',
    sheetAllowedDetents: SHEET_DETENTS,
    sheetGrabberVisible: true,
    sheetCornerRadius: radius.sheet,
    contentStyle: { backgroundColor: surface },
  }), [surface]);
};

interface StateReader {
  getState: () => NavigationState | undefined;
}

// True when this screen lost focus to a sheet over it, which is still part of the screen.
export const isCoveredBySheet = (navigation: StateReader): boolean => {
  const state = navigation.getState();

  return state?.routes[state.index]?.name === SHEET_ROUTE;
};

type SheetScreenProps = NativeStackScreenProps<ParamListBase & { [SHEET_ROUTE]: SheetRouteParams }, typeof SHEET_ROUTE>;

// Generic sheet route: renders whatever the BottomSheet that pushed it currently describes.
export const SheetScreen = ({ navigation, route }: SheetScreenProps): ReactElement | null => {
  const { id } = route.params;
  const content = useSyncExternalStore(listener => sheetStore.subscribe(id, listener), () => sheetStore.getContent(id));
  const dismissible = content?.dismissible ?? true;

  useEffect(() => sheetStore.attach(id, () => {
    const state = navigation.getState();

    // The route may already be gone with its owner, e.g. popToTop after a send.
    if (state?.routes.some(stackRoute => stackRoute.key === route.key)) {
      navigation.dispatch({ ...StackActions.pop(), source: route.key, target: state.key });
    }
  }), [id, navigation, route.key]);

  useEffect(() => {
    const subscriptions = [
      navigation.addListener('transitionStart', (event) => {
        if (!event.data.closing) {
          sheetStore.getOwner(id)?.onWillOpen();
        }
      }),
      navigation.addListener('transitionEnd', (event) => {
        if (!event.data.closing) {
          sheetStore.getOwner(id)?.onOpened();
        }
      }),
      // Android back goes through JS; native swipes and scrim taps are handled by the owner.
      navigation.addListener('beforeRemove', (event) => {
        if (event.data.action.type === 'GO_BACK' && !sheetStore.isClosing(id) && sheetStore.getContent(id)?.dismissible === false) {
          event.preventDefault();
        }
      }),
    ];

    return (): void => subscriptions.forEach(unsubscribe => unsubscribe());
  }, [id, navigation]);

  // iOS: `modalInPresentation` blocks the swipe and the scrim tap.
  useLayoutEffect(() => navigation.setOptions({ gestureEnabled: dismissible }), [dismissible, navigation]);

  if (!content) {
    return null;
  }

  return (
    <SheetFrame title={content.title} description={content.description} onClose={content.dismissible ? content.onClose : undefined}>
      {content.children}
    </SheetFrame>
  );
};
