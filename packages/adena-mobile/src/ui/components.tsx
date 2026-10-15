import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {colors, radius, spacing} from './theme';

export function Screen({
  children,
  scroll = true,
  topInset = false,
}: React.PropsWithChildren<{scroll?: boolean; topInset?: boolean}>) {
  const body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView
      style={styles.screen}
      // Screens without a navigation header must keep clear of the status bar.
      edges={
        topInset
          ? ['top', 'bottom', 'left', 'right']
          : ['bottom', 'left', 'right']
      }>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function Title({children}: React.PropsWithChildren) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({
  children,
  muted,
}: React.PropsWithChildren<{muted?: boolean}>) {
  return (
    <Text style={[styles.body_text, muted && styles.muted]}>{children}</Text>
  );
}

export function Mono({children}: React.PropsWithChildren) {
  return (
    <Text selectable style={styles.mono}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({pressed}) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || inactive) && styles.buttonDimmed,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? colors.text : colors.primaryText}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'secondary' && styles.buttonTextSecondary,
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
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
  style,
  ...props
}: TextInputProps & {label: string; secret?: boolean}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, style]}
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
        placeholderTextColor={colors.textMuted}
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
        style={
          tone === 'danger' ? styles.noticeDangerText : styles.noticeWarningText
        }>
        {children}
      </Text>
    </View>
  );
}

export function ErrorText({children}: React.PropsWithChildren) {
  if (!children) {
    return null;
  }
  return <Text style={styles.error}>{children}</Text>;
}

export function Card({
  children,
  style,
}: React.PropsWithChildren<{style?: ViewStyle}>) {
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

export function Gap({size = spacing.md}: {size?: number}) {
  return <View style={{height: size}} />;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  body: {padding: spacing.lg, gap: spacing.md},
  title: {fontSize: 24, fontWeight: '700', color: colors.text},
  body_text: {fontSize: 15, lineHeight: 22, color: colors.text},
  muted: {color: colors.textMuted},
  mono: {fontFamily: 'Menlo', fontSize: 14, color: colors.text},
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: {backgroundColor: colors.danger},
  buttonDimmed: {opacity: 0.6},
  buttonText: {color: colors.primaryText, fontSize: 16, fontWeight: '600'},
  buttonTextSecondary: {color: colors.text},
  field: {gap: spacing.xs},
  label: {fontSize: 13, color: colors.textMuted},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  notice: {borderRadius: radius.sm, padding: spacing.md},
  noticeWarning: {backgroundColor: colors.warningSurface},
  noticeDanger: {backgroundColor: colors.dangerSurface},
  noticeWarningText: {color: colors.warning, fontSize: 14, lineHeight: 20},
  noticeDangerText: {color: colors.danger, fontSize: 14, lineHeight: 20},
  error: {color: colors.danger, fontSize: 14},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md},
  rowLabel: {fontSize: 14, color: colors.textMuted},
  rowValue: {flexShrink: 1, alignItems: 'flex-end'},
  rowValueText: {fontSize: 14, color: colors.text, textAlign: 'right'},
});
