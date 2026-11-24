import { createContext, use, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Keyboard, KeyboardEvent, Platform, TextInput } from 'react-native';

// UIKit's keyboard curve (UIViewAnimationCurve 7) as a cubic bezier; iOS reports its duration per event.
const IOS_KEYBOARD_EASING = Easing.bezier(0.38, 0.7, 0.125, 1);
// Android's IME inset animation (InsetsController): 285 ms show, 200 ms hide, emphasized decelerate.
const ANDROID_IME_EASING = Easing.bezier(0.2, 0, 0, 1);
const ANDROID_SHOW_MS = 285;
const ANDROID_HIDE_MS = 200;
// The native soft input height event is debounced by ~250 ms; an unconfirmed guess is undone after this.
const ANDROID_CONFIRM_MS = 700;
const ANDROID_BLUR_GRACE_MS = 80;

// Last IME height seen on Android, reused to start moving on focus instead of waiting for the event.
let lastAndroidImeHeight = 0;

// Lets fields inside a sheet tell it the keyboard is about to open or close (Android only).
export interface SheetKeyboardHandle {
  onInputFocus: () => void;
  onInputBlur: () => void;
}

export const SheetKeyboardContext = createContext<SheetKeyboardHandle | null>(null);

export const useSheetKeyboardHandle = (): SheetKeyboardHandle | null => use(SheetKeyboardContext);

export interface SheetKeyboard {
  // How far the sheet is lifted above the screen bottom; drives a native-driver translateY.
  lift: Animated.Value;
  handle: SheetKeyboardHandle;
  // Android: the soft input height reported by AvoidSoftInputView (dp, system bars excluded).
  onAndroidHeight: (height: number) => void;
  // Closes the keyboard only while one of the sheet's own fields has focus, so a field the
  // screen below focuses as the sheet closes keeps its keyboard.
  dismissOwnKeyboard: () => void;
}

type FocusedInput = ReturnType<typeof TextInput.State.currentlyFocusedInput>;

// The sheet follows the keyboard itself, so nothing else (Modal, avoid-softinput offset) adjusts it.
export const useSheetKeyboard = (active: boolean, bottomInset: number): SheetKeyboard => {
  const lift = useRef(new Animated.Value(0)).current;
  const confirmedRef = useRef(0);
  const targetRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusedInputRef = useRef<{ input: FocusedInput } | null>(null);

  const clearTimer = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateTo = useCallback((value: number, duration: number, easing: (t: number) => number): void => {
    if (value === targetRef.current) {
      return;
    }

    targetRef.current = value;
    Animated.timing(lift, { toValue: value, duration, easing, useNativeDriver: true }).start();
  }, [lift]);

  // iOS: keyboard will-events arrive before the keyboard moves and carry its duration.
  useEffect(() => {
    if (!active || Platform.OS !== 'ios') {
      return;
    }

    const onFrame = (event: KeyboardEvent): void => {
      const height = Math.max(0, Dimensions.get('screen').height - event.endCoordinates.screenY);

      animateTo(Math.max(0, height - bottomInset), event.duration || 250, IOS_KEYBOARD_EASING);
    };
    const onHide = (event: KeyboardEvent): void => animateTo(0, event.duration || 250, IOS_KEYBOARD_EASING);
    const subscriptions = [
      Keyboard.addListener('keyboardWillChangeFrame', onFrame),
      Keyboard.addListener('keyboardWillHide', onHide),
    ];

    return (): void => subscriptions.forEach(subscription => subscription.remove());
  }, [active, animateTo, bottomInset]);

  useEffect(() => {
    if (!active) {
      clearTimer();
      confirmedRef.current = 0;
      targetRef.current = 0;
      lift.setValue(0);
    }

    return clearTimer;
  }, [active, clearTimer, lift]);

  const onAndroidHeight = useCallback((height: number): void => {
    clearTimer();
    confirmedRef.current = height;

    if (height > 0) {
      lastAndroidImeHeight = height;
    }

    animateTo(height, height > 0 ? ANDROID_SHOW_MS : ANDROID_HIDE_MS, ANDROID_IME_EASING);
  }, [animateTo, clearTimer]);

  const handle = useMemo<SheetKeyboardHandle>(() => ({
    onInputFocus: (): void => {
      focusedInputRef.current = { input: TextInput.State.currentlyFocusedInput() };

      if (Platform.OS !== 'android') {
        return;
      }

      clearTimer();

      // Moves with the IME as it starts; the debounced height event confirms or corrects it.
      if (lastAndroidImeHeight > 0 && confirmedRef.current === 0) {
        animateTo(lastAndroidImeHeight, ANDROID_SHOW_MS, ANDROID_IME_EASING);
        timerRef.current = setTimeout(() => animateTo(confirmedRef.current, ANDROID_HIDE_MS, ANDROID_IME_EASING), ANDROID_CONFIRM_MS);
      }
    },
    onInputBlur: (): void => {
      if (Platform.OS !== 'android') {
        return;
      }

      clearTimer();
      // A grace period lets focus move to the next field without a dip.
      timerRef.current = setTimeout(() => {
        animateTo(0, ANDROID_HIDE_MS, ANDROID_IME_EASING);
        timerRef.current = setTimeout(() => animateTo(confirmedRef.current, ANDROID_SHOW_MS, ANDROID_IME_EASING), ANDROID_CONFIRM_MS);
      }, ANDROID_BLUR_GRACE_MS);
    },
  }), [animateTo, clearTimer]);

  const dismissOwnKeyboard = useCallback((): void => {
    const focused = focusedInputRef.current;

    focusedInputRef.current = null;

    if (focused && focused.input === TextInput.State.currentlyFocusedInput()) {
      Keyboard.dismiss();
    }
  }, []);

  return { lift, handle, onAndroidHeight, dismissOwnKeyboard };
};
