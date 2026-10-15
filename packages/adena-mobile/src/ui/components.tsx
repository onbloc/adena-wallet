import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  colors,
  colorTokens,
  fonts,
  monoFont,
  radius,
  spacing,
  webColors,
} from './theme';

export type ScreenTone = 'popup' | 'web';

export function Screen({
  children,
  scroll = true,
  topInset = false,
  tone = 'popup',
  footer,
}: React.PropsWithChildren<{
  scroll?: boolean;
  topInset?: boolean;
  /** 'web' uses the extension's full-page palette (onboarding). */
  tone?: ScreenTone;
  /** Pinned below the scrolling content, like the popup's bottom buttons. */
  footer?: React.ReactNode;
}>) {
  const body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView
      style={[styles.screen, tone === 'web' && styles.screenWeb]}
      // Screens without a navigation header must keep clear of the status bar.
      edges={
        topInset
          ? ['top', 'bottom', 'left', 'right']
          : ['bottom', 'left', 'right']
      }>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Title({
  children,
  center,
}: React.PropsWithChildren<{center?: boolean}>) {
  return (
    <Text
      accessibilityRole="header"
      style={[styles.title, center && styles.center]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  center,
  style,
}: React.PropsWithChildren<{
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
}>) {
  return (
    <Text
      style={[
        styles.bodyText,
        muted && styles.muted,
        center && styles.center,
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Mono({children}: React.PropsWithChildren) {
  return (
    <Text selectable style={styles.mono}>
      {children}
    </Text>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * The popup button: 48px tall, fully rounded. `secondary` is the extension's
 * "normal" (grey) hierarchy, `ghost` its outlined one.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  testID,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{disabled: !!inactive, busy: !!loading}}
      onPress={onPress}
      disabled={inactive}
      style={({pressed}) => [
        styles.button,
        buttonStyles[variant],
        pressed && pressedStyles[variant],
        disabled && disabledStyles[variant],
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          {icon}
          <Text
            style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Cancel / confirm pair at the bottom of approval and review screens. */
export function ButtonPair({
  cancel,
  confirm,
}: {
  cancel: React.ComponentProps<typeof Button>;
  confirm: React.ComponentProps<typeof Button>;
}) {
  return (
    <View style={styles.buttonPair}>
      <Button variant="secondary" {...cancel} style={styles.flex} />
      <Button {...confirm} style={styles.flex} />
    </View>
  );
}

/**
 * Text input for secrets and addresses: no autocorrect, autocomplete,
 * autofill or keyboard learning, so typed words never reach the keyboard's
 * dictionary or the system's suggestion stores.
 */
export function Field({
  label,
  secret,
  error,
  style,
  tone = 'popup',
  ...props
}: TextInputProps & {
  label: string;
  secret?: boolean;
  error?: boolean;
  tone?: ScreenTone;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        style={[
          styles.input,
          tone === 'web' && styles.inputWeb,
          props.multiline && styles.inputMultiline,
          secret && !!props.value && styles.inputSecret,
          error && styles.inputError,
          style,
        ]}
        secureTextEntry={secret}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        importantForAutofill="no"
        // 'oneTimeCode' keeps iOS from offering to save the wallet password
        // to iCloud Keychain, which would sync it off the device.
        textContentType={secret ? 'oneTimeCode' : 'none'}
        keyboardType={
          secret ? 'default' : props.keyboardType ?? 'visible-password'
        }
        keyboardAppearance="dark"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
      />
    </View>
  );
}

export function Notice({
  children,
  tone = 'warning',
}: React.PropsWithChildren<{tone?: 'warning' | 'danger'}>) {
  return (
    <View
      style={[
        styles.notice,
        tone === 'danger' ? styles.noticeDanger : styles.noticeWarning,
      ]}>
      <Text
        style={[
          styles.noticeText,
          tone === 'danger'
            ? styles.noticeDangerText
            : styles.noticeWarningText,
        ]}>
        {children}
      </Text>
    </View>
  );
}

export function ErrorText({children}: React.PropsWithChildren) {
  if (!children) {
    return null;
  }
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: React.PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({label, value}: {label: string; value: React.ReactNode}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>
        {typeof value === 'string' ? (
          <Text selectable style={styles.rowValueText}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

/** A tappable settings-style row: label on the left, optional detail and chevron. */
export function ListItem({
  title,
  detail,
  onPress,
  danger,
  testID,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.listItem,
        pressed && styles.listItemPressed,
      ]}>
      <Text style={[styles.listItemTitle, danger && styles.listItemDanger]}>
        {title}
      </Text>
      {detail ? <Text style={styles.listItemDetail}>{detail}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function Gap({size = spacing.md}: {size?: number}) {
  return <View style={{height: size}} />;
}

const buttonStyles = StyleSheet.create({
  primary: {backgroundColor: colors.primary},
  secondary: {backgroundColor: colors.surfaceRaised},
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  danger: {backgroundColor: colors.danger},
});

const pressedStyles = StyleSheet.create({
  primary: {backgroundColor: colors.primaryPressed},
  secondary: {backgroundColor: colorTokens.neutral.b},
  ghost: {backgroundColor: colorTokens.neutral._6},
  danger: {backgroundColor: '#BB150B'},
});

const disabledStyles = StyleSheet.create({
  primary: {backgroundColor: colors.primaryDisabled},
  secondary: {opacity: 0.5},
  ghost: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colorTokens.neutral._4,
  },
  danger: {opacity: 0.5},
});

const styles = StyleSheet.create({
  flex: {flex: 1},
  center: {textAlign: 'center'},
  screen: {flex: 1, backgroundColor: colors.background},
  screenWeb: {backgroundColor: webColors.background},
  scrollContent: {flexGrow: 1},
  body: {padding: 20, gap: spacing.md, flexGrow: 1},
  footer: {
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {...fonts.header4, color: colors.text},
  bodyText: {...fonts.body1Reg, color: colors.text},
  muted: {...fonts.body2Reg, color: colors.textMuted},
  mono: {...monoFont, fontSize: 14, lineHeight: 21, color: colors.text},
  button: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: {...fonts.body1Bold, color: colors.primaryText},
  buttonTextDisabled: {color: colors.disabledText},
  buttonPair: {flexDirection: 'row', gap: 10},
  field: {gap: 6},
  label: {...fonts.body2Reg, color: colors.textMuted},
  input: {
    ...fonts.body2Reg,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
  },
  inputWeb: {
    backgroundColor: webColors.input,
    borderColor: webColors.border,
    borderRadius: 12,
  },
  inputMultiline: {
    borderRadius: radius.md,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputSecret: {letterSpacing: 4},
  inputError: {borderColor: colors.danger},
  notice: {borderRadius: radius.md, padding: 14, borderWidth: 1},
  noticeWarning: {
    backgroundColor: colors.warningSurface,
    borderColor: colors.warning,
  },
  noticeDanger: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.danger,
  },
  noticeText: {...fonts.body2Reg},
  noticeWarningText: {color: colors.warning},
  noticeDangerText: {color: colors.danger},
  error: {...fonts.captionReg, color: colors.danger},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md},
  rowLabel: {...fonts.body2Reg, color: colors.textMuted},
  rowValue: {flexShrink: 1, alignItems: 'flex-end'},
  rowValueText: {...fonts.body2Reg, color: colors.text, textAlign: 'right'},
  listItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  listItemPressed: {backgroundColor: colors.surfaceRaised},
  listItemTitle: {...fonts.body1Bold, color: colors.text, flex: 1},
  listItemDanger: {color: colors.danger},
  listItemDetail: {...fonts.body2Reg, color: colors.textMuted},
  chevron: {...fonts.body1Reg, color: colors.textMuted},
});
