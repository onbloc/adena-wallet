import RemoveIcon from '@assets/icon-remove-blur.svg';
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {Modal, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button, ButtonPair} from './components';
import {ChevronRightIcon} from './icons';
import {colors, colorTokens, fonts, monoFont, radius} from './theme';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** A value to check before confirming (a path, an address), in mono. */
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  /** `danger` draws the remove mark and a red confirm button. */
  tone?: 'default' | 'danger';
}

export interface SheetOption {
  label: string;
  danger?: boolean;
  /** With an icon or description the option is drawn as a card. */
  icon?: React.ReactNode;
  description?: string;
}

interface ModalApi {
  /** Resolves true on confirm, false on cancel or a tap outside. */
  confirm(options: ConfirmOptions): Promise<boolean>;
  /** Shows a bottom sheet; resolves the chosen index, or null. */
  chooseOption(title: string, options: SheetOption[]): Promise<number | null>;
  /** A notice with one button. */
  inform(title: string, message?: string): Promise<void>;
}

type Pending =
  | {kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void}
  | {
      kind: 'sheet';
      title: string;
      options: SheetOption[];
      resolve: (index: number | null) => void;
    }
  | {kind: 'inform'; title: string; message?: string; resolve: () => void};

const ModalContext = createContext<ModalApi | null>(null);

export function useModal(): ModalApi {
  const value = useContext(ModalContext);
  if (!value) {
    throw new Error('useModal must be used inside ModalProvider');
  }
  return value;
}

/**
 * The app's dialogs in the popup's look (dark card, header4 title, Cancel /
 * confirm pair, the remove mark for destructive steps) instead of the system
 * alert, which looks foreign next to the extension design.
 */
export function ModalProvider({children}: React.PropsWithChildren) {
  const [pending, setPending] = useState<Pending | null>(null);
  const current = useRef<Pending | null>(null);
  // The answer waits for the close animation on iOS: a modal presented while
  // another is still dismissing (e.g. re-authentication next) never shows.
  const settle = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();

  const open = useCallback((next: Pending) => {
    current.current = next;
    setPending(next);
  }, []);

  const finish = useCallback((answer: () => void) => {
    current.current = null;
    setPending(null);
    if (Platform.OS === 'ios') {
      settle.current = answer;
    } else {
      answer();
    }
  }, []);

  const onDismiss = () => {
    const answer = settle.current;
    settle.current = null;
    answer?.();
  };

  const api = useRef<ModalApi>({
    confirm: options =>
      new Promise(resolve => open({kind: 'confirm', options, resolve})),
    chooseOption: (title, options) =>
      new Promise(resolve => open({kind: 'sheet', title, options, resolve})),
    inform: (title, message) =>
      new Promise(resolve => open({kind: 'inform', title, message, resolve})),
  }).current;

  const dismiss = () => {
    const shown = current.current;
    if (shown?.kind === 'confirm') {
      finish(() => shown.resolve(false));
    } else if (shown?.kind === 'sheet') {
      finish(() => shown.resolve(null));
    } else if (shown?.kind === 'inform') {
      finish(() => shown.resolve());
    }
  };

  return (
    <ModalContext.Provider value={api}>
      {children}
      <Modal
        visible={!!pending}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismiss}
        onDismiss={onDismiss}>
        <Pressable
          accessibilityLabel="Close"
          style={[
            styles.backdrop,
            pending?.kind === 'sheet' && styles.backdropSheet,
          ]}
          onPress={dismiss}>
          {pending?.kind === 'confirm' && (
            <Pressable style={styles.card} onPress={() => undefined}>
              {pending.options.tone === 'danger' && (
                <RemoveIcon width={72} height={72} />
              )}
              <Text accessibilityRole="header" style={styles.title}>
                {pending.options.title}
              </Text>
              {pending.options.message ? (
                <Text style={styles.message}>{pending.options.message}</Text>
              ) : null}
              {pending.options.detail ? (
                <Text selectable style={styles.detail}>
                  {pending.options.detail}
                </Text>
              ) : null}
              <View style={styles.buttons}>
                <ButtonPair
                  cancel={{
                    title: pending.options.cancelText ?? 'Cancel',
                    testID: 'modal-cancel',
                    onPress: () => finish(() => pending.resolve(false)),
                  }}
                  confirm={{
                    title: pending.options.confirmText ?? 'Confirm',
                    testID: 'modal-confirm',
                    variant:
                      pending.options.tone === 'danger' ? 'danger' : 'primary',
                    onPress: () => finish(() => pending.resolve(true)),
                  }}
                />
              </View>
            </Pressable>
          )}
          {pending?.kind === 'inform' && (
            <Pressable style={styles.card} onPress={() => undefined}>
              <Text accessibilityRole="header" style={styles.title}>
                {pending.title}
              </Text>
              {pending.message ? (
                <Text style={styles.message}>{pending.message}</Text>
              ) : null}
              <View style={styles.buttons}>
                <Button
                  title="OK"
                  testID="modal-ok"
                  onPress={() => finish(() => pending.resolve())}
                />
              </View>
            </Pressable>
          )}
          {pending?.kind === 'sheet' && (
            <Pressable
              style={[styles.sheet, {paddingBottom: insets.bottom + 16}]}
              onPress={() => undefined}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {pending.title}
              </Text>
              {pending.options.some(
                option => option.icon || option.description,
              ) ? (
                <View style={styles.cards}>
                  {pending.options.map((option, index) => (
                    <Pressable
                      key={option.label}
                      accessibilityRole="button"
                      accessibilityHint={option.description}
                      testID={`sheet-option-${index}`}
                      onPress={() => finish(() => pending.resolve(index))}
                      style={({pressed}) => [
                        styles.optionCard,
                        pressed && styles.cardPressed,
                      ]}>
                      <View
                        style={[
                          styles.iconTile,
                          option.danger && styles.iconTileDanger,
                        ]}>
                        {option.icon}
                      </View>
                      <View style={styles.cardText}>
                        <Text
                          style={[
                            styles.cardTitle,
                            option.danger && styles.optionDanger,
                          ]}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text style={styles.cardDescription}>
                            {option.description}
                          </Text>
                        ) : null}
                      </View>
                      <ChevronRightIcon />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.options}>
                  {pending.options.map((option, index) => (
                    <Pressable
                      key={option.label}
                      accessibilityRole="button"
                      testID={`sheet-option-${index}`}
                      onPress={() => finish(() => pending.resolve(index))}
                      style={({pressed}) => [
                        styles.option,
                        index > 0 && styles.optionDivider,
                        pressed && styles.optionPressed,
                      ]}>
                      <Text
                        style={[
                          styles.optionText,
                          option.danger && styles.optionDanger,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Button
                variant="dark"
                title="Cancel"
                testID="sheet-cancel"
                onPress={dismiss}
              />
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </ModalContext.Provider>
  );
}

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropSheet: {justifyContent: 'flex-end', padding: 0},
  card: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral._7,
    backgroundColor: neutral._8,
  },
  title: {...fonts.header4, color: colors.text, textAlign: 'center'},
  message: {...fonts.body1Reg, color: colors.textMuted, textAlign: 'center'},
  detail: {
    ...monoFont,
    alignSelf: 'stretch',
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
    padding: 12,
    borderRadius: 8,
    backgroundColor: neutral._9,
  },
  buttons: {alignSelf: 'stretch', marginTop: 8},
  sheet: {
    gap: 12,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral._7,
    backgroundColor: neutral._8,
  },
  sheetTitle: {...fonts.header6, color: colors.text, textAlign: 'center'},
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: -8,
    backgroundColor: neutral._6,
  },
  cards: {gap: 10},
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral._7,
    backgroundColor: neutral._9,
  },
  cardPressed: {backgroundColor: neutral._7},
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(122, 169, 255, 0.24)',
    backgroundColor: 'rgba(0, 89, 255, 0.16)',
  },
  iconTileDanger: {
    borderColor: 'rgba(239, 45, 33, 0.24)',
    backgroundColor: colors.dangerSurface,
  },
  cardText: {flex: 1, gap: 3},
  cardTitle: {...fonts.body1Bold, color: colors.text},
  cardDescription: {...fonts.captionReg, color: colors.textMuted},
  options: {
    borderRadius: 12.5,
    overflow: 'hidden',
    backgroundColor: neutral._9,
  },
  option: {height: 48, justifyContent: 'center', paddingHorizontal: 16},
  optionDivider: {borderTopWidth: 1, borderTopColor: neutral._7},
  optionPressed: {backgroundColor: neutral._7},
  optionText: {...fonts.body1Reg, color: colors.text},
  optionDanger: {color: colors.danger},
});
