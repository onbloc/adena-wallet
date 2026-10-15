/**
 * Onboarding components, after the extension's full-page (web) atoms:
 * web-button, web-input, web-check-box, web-main-header, web-seed-box and
 * friends. Hover states from the web become pressed states here.
 */
import ChevronLeft from '@assets/web/chevron-left.svg';
import ChevronRight from '@assets/web/chevron-right.svg';
import CheckIcon from '@assets/web/check.svg';
import ErrorIcon from '@assets/web/error.svg';
import WarningIcon from '@assets/web/warning.svg';
import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
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
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';

import {colorTokens, monoFont, webFonts} from './theme';

const {webNeutral, webInput, webPrimary, webError, webWarning, webBase} =
  colorTokens;

/** The extension body background: black with a blue glow at the bottom. */
function WebBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="0%" r="100%" fx="50%" fy="0%">
          <Stop offset="0.4883" stopColor="#101214" stopOpacity={0} />
          <Stop offset="1" stopColor="#0059FF" stopOpacity={0.24} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#glow)" />
    </Svg>
  );
}

export function WebScreen({
  children,
  footer,
  header,
}: React.PropsWithChildren<{
  /** Pinned at the bottom (main button). */
  footer?: React.ReactNode;
  /** Pinned at the top (back button and step dots). */
  header?: React.ReactNode;
}>) {
  return (
    // The glow sits behind the safe area so it reaches the screen edges.
    <View style={styles.screen}>
      <WebBackground />
      <SafeAreaView style={styles.safeArea}>
        {header ? <View style={styles.header}>{header}</View> : null}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

/** Back button on the left, progress dots in the middle (web-main-header). */
export function WebStepHeader({
  onBack,
  step,
  steps,
}: {
  onBack?: () => void;
  /** 0-based index of the current step. */
  step: number;
  steps: number;
}) {
  return (
    <View style={styles.stepHeader}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={onBack}
          style={styles.backButton}>
          <ChevronLeft width={24} height={24} />
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}
      <View
        style={styles.dots}
        accessibilityLabel={`Step ${step + 1} of ${steps}`}>
        {steps > 1 &&
          Array.from({length: steps}, (_, index) => (
            <View
              key={index}
              style={[styles.dot, index === step && styles.dotActive]}
            />
          ))}
      </View>
      <View style={styles.backPlaceholder} />
    </View>
  );
}

export function WebText({
  type,
  color = webNeutral._100,
  style,
  children,
  center,
}: React.PropsWithChildren<{
  type: keyof typeof webFonts;
  color?: string;
  style?: StyleProp<TextStyle>;
  center?: boolean;
}>) {
  return (
    <Text style={[webFonts[type], {color}, center && styles.center, style]}>
      {children}
    </Text>
  );
}

/** Title with a muted description below it (web-title-with-description). */
export function WebTitle({
  title,
  description,
  size = 'headline3',
}: {
  title: string;
  description?: string;
  size?: 'headline2' | 'headline3' | 'headline4';
}) {
  return (
    <View style={styles.title}>
      <WebText type={size}>{title}</WebText>
      {description ? (
        <WebText type="body4" color={webNeutral._500}>
          {description}
        </WebText>
      ) : null}
    </View>
  );
}

export type WebButtonFigure = 'primary' | 'secondary' | 'tertiary';

export function WebButton({
  title,
  onPress,
  figure = 'primary',
  disabled,
  chevron,
  testID,
  style,
}: {
  title: string;
  onPress: () => void;
  figure?: WebButtonFigure;
  disabled?: boolean;
  /** The trailing chevron the extension puts on "Next"-type buttons. */
  chevron?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        figureStyles[figure],
        pressed && pressedFigureStyles[figure],
        disabled && styles.disabled,
        style,
      ]}>
      {({pressed}) => (
        <>
          {chevron ? <View style={styles.chevronSpacer} /> : null}
          <Text
            style={[
              webFonts.title4,
              {color: figureTextColor(figure, pressed)},
            ]}>
            {title}
          </Text>
          {chevron ? <ChevronRight width={24} height={24} /> : null}
        </>
      )}
    </Pressable>
  );
}

function figureTextColor(figure: WebButtonFigure, pressed: boolean): string {
  switch (figure) {
    case 'primary':
      return webNeutral._100;
    case 'secondary':
      return pressed ? '#7AA9FF' : '#ADCAFF';
    case 'tertiary':
      return pressed ? webNeutral._100 : webNeutral._300;
  }
}

/** Large two-line choice button on the landing screen (web-main-button list). */
export function WebChoiceButton({
  title,
  description,
  icon,
  figure,
  onPress,
  testID,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  figure: WebButtonFigure;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.choice,
        figureStyles[figure],
        pressed && pressedFigureStyles[figure],
      ]}>
      {icon}
      <View style={styles.choiceText}>
        <Text
          style={[webFonts.title5, {color: figureTextColor(figure, false)}]}>
          {title}
        </Text>
        <Text style={[webFonts.body6, {color: CHOICE_DESCRIPTION[figure]}]}>
          {description}
        </Text>
      </View>
      <ChevronRight width={24} height={24} />
    </Pressable>
  );
}

const CHOICE_DESCRIPTION: Record<WebButtonFigure, string> = {
  primary: 'rgba(250, 252, 255, 0.6)',
  secondary: 'rgba(173, 202, 255, 0.6)',
  tertiary: 'rgba(188, 197, 214, 0.6)',
};

/**
 * Text input with the same keyboard hardening as the popup Field: no
 * autocorrect, suggestions, autofill or keyboard learning.
 */
export function WebInput({
  label,
  secret,
  error,
  style,
  ...props
}: TextInputProps & {label: string; secret?: boolean; error?: boolean}) {
  return (
    <TextInput
      {...props}
      accessibilityLabel={label}
      placeholder={props.placeholder ?? label}
      style={[
        styles.input,
        !!props.value && styles.inputFilled,
        props.multiline && styles.inputMultiline,
        error && styles.inputError,
        style,
      ]}
      {...SECURE_INPUT_PROPS}
      secureTextEntry={secret}
      textContentType={secret ? 'oneTimeCode' : 'none'}
      keyboardType={
        secret ? 'default' : props.keyboardType ?? 'visible-password'
      }
    />
  );
}

const SECURE_INPUT_PROPS: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'off',
  spellCheck: false,
  importantForAutofill: 'no',
  keyboardAppearance: 'dark',
  placeholderTextColor: webNeutral._700,
  selectionColor: webPrimary._100,
};

export function WebErrorText({children}: React.PropsWithChildren) {
  if (!children) {
    return null;
  }
  return (
    <View style={styles.errorRow} accessibilityRole="alert">
      <ErrorIcon width={20} height={20} />
      <Text style={[webFonts.body5, styles.errorText]}>{children}</Text>
    </View>
  );
}

export function WebCheckBox({
  checked,
  onChange,
  label,
  testID,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{checked}}
      onPress={() => onChange(!checked)}
      style={styles.checkRow}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <CheckIcon width={16} height={16} /> : null}
      </View>
      <Text style={[webFonts.body5, styles.checkLabel]}>{label}</Text>
    </Pressable>
  );
}

/** Yellow notice with the warning icon (seed phrase step). */
export function WebWarning({children}: React.PropsWithChildren) {
  return (
    <View style={styles.warning}>
      <WarningIcon width={20} height={20} />
      <Text style={[webFonts.body6, styles.warningText]}>{children}</Text>
    </View>
  );
}

/** Red variant for things that already went wrong (a screenshot was taken). */
export function WebDanger({children}: React.PropsWithChildren) {
  return (
    <View style={[styles.warning, styles.danger]} accessibilityRole="alert">
      <ErrorIcon width={20} height={20} />
      <Text style={[webFonts.body6, styles.dangerText]}>{children}</Text>
    </View>
  );
}

/**
 * Three-column numbered word grid (web-seed-box). While `hidden`, words are
 * masked: the extension blurs them, a mask keeps them off the screen entirely.
 */
export function SeedGrid({words, hidden}: {words: string[]; hidden?: boolean}) {
  return (
    <View style={styles.seedGrid}>
      {words.map((word, index) => (
        <View
          key={`${index}-${word}`}
          style={[styles.seedCell, !hidden && styles.seedCellRevealed]}>
          <View style={styles.seedIndex}>
            <Text style={styles.seedIndexText}>{index + 1}</Text>
          </View>
          <Text
            style={[styles.seedWord, hidden && styles.seedWordHidden]}
            numberOfLines={1}>
            {hidden ? '•••••' : word}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Labelled one-word input ("Word #N" on the left), as on the verify step. */
export function SeedWordInput({
  label,
  labelWidth = 90,
  error,
  compact,
  containerStyle,
  ...props
}: TextInputProps & {
  label: string;
  labelWidth?: number;
  error?: boolean;
  /** Smaller text for the 3-column import grid. */
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.seedInput,
        !!props.value && styles.seedInputFilled,
        error && styles.seedInputError,
        containerStyle,
      ]}>
      <View
        style={[
          styles.seedInputLabel,
          {width: labelWidth},
          error && styles.seedInputLabelError,
        ]}>
        <Text
          style={[
            webFonts.body5,
            {color: error ? webError._100 : webNeutral._500},
          ]}>
          {label}
        </Text>
      </View>
      <TextInput
        {...props}
        accessibilityLabel={label}
        style={[
          compact ? webFonts.body5 : webFonts.body4,
          styles.seedInputField,
          compact && styles.seedInputFieldCompact,
          error && styles.seedInputFieldError,
        ]}
        {...SECURE_INPUT_PROPS}
        keyboardType="visible-password"
        textContentType="none"
      />
    </View>
  );
}

/** Pill tabs ("12 words / 24 words / Private Key" on import). */
export function WebTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: {key: T; label: string}[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {tabs.map(tab => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, selected && styles.tabSelected]}>
            <Text
              style={[
                webFonts.title5,
                {color: selected ? webNeutral._100 : webNeutral._500},
              ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const HOLD_MS = 3_000;

/**
 * Press and hold for three seconds to reveal (web-hold-button). Releasing
 * early resets the fill; pressing again after a reveal hides the words.
 */
export function HoldToReveal({
  revealed,
  onChange,
}: {
  revealed: boolean;
  onChange: (revealed: boolean) => void;
}) {
  const progress = useRef(new Animated.Value(revealed ? 1 : 0)).current;
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    progress.setValue(revealed ? 1 : 0);
  }, [revealed, progress]);

  const start = () => {
    if (revealed) {
      onChange(false);
      return;
    }
    setHolding(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    }).start(({finished}) => {
      setHolding(false);
      if (finished) {
        onChange(true);
      }
    });
  };

  const cancel = () => {
    if (!revealed) {
      progress.stopAnimation();
      progress.setValue(0);
      setHolding(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Press and hold for three seconds"
      onPressIn={start}
      onPressOut={cancel}
      style={[styles.hold, (holding || revealed) && styles.holdActive]}>
      <Animated.View
        style={[
          styles.holdFill,
          {
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
      <Text
        style={[
          webFonts.title6,
          {color: holding || revealed ? webNeutral._100 : webNeutral._500},
        ]}>
        {revealed ? 'Hide Seed Phrase' : 'Hold to Reveal'}
      </Text>
    </Pressable>
  );
}

const figureStyles = StyleSheet.create({
  primary: {
    backgroundColor: webPrimary._100,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  secondary: {
    backgroundColor: 'rgba(0, 89, 255, 0.16)',
    borderColor: 'rgba(122, 169, 255, 0.24)',
  },
  tertiary: {
    backgroundColor: 'rgba(188, 197, 214, 0.04)',
    borderColor: 'rgba(188, 197, 214, 0.24)',
  },
});

const pressedFigureStyles = StyleSheet.create({
  primary: {backgroundColor: '#004BD6'},
  secondary: {backgroundColor: 'rgba(0, 89, 255, 0.24)'},
  tertiary: {backgroundColor: 'rgba(188, 197, 214, 0.08)'},
});

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: webBase._100},
  safeArea: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 8},
  scroll: {flexGrow: 1, padding: 20, gap: 24},
  footer: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12},
  center: {textAlign: 'center'},
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: webInput._100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {width: 32, height: 32},
  dots: {flexDirection: 'row', gap: 8},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 89, 255, 0.32)',
  },
  dotActive: {backgroundColor: webPrimary._100},
  title: {gap: 10},
  button: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chevronSpacer: {width: 12},
  disabled: {opacity: 0.4},
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  choiceText: {flex: 1, gap: 3},
  input: {
    ...webFonts.body5,
    color: webNeutral._0,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: webNeutral._800,
    backgroundColor: webNeutral._900,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputFilled: {backgroundColor: webInput._100},
  inputMultiline: {minHeight: 80, textAlignVertical: 'top', paddingTop: 16},
  inputError: {borderColor: webError._200, backgroundColor: webError._300},
  errorRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  errorText: {color: webError._100, flex: 1},
  checkRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: webNeutral._600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    backgroundColor: webPrimary._100,
    borderColor: webPrimary._100,
  },
  checkLabel: {color: webNeutral._500, flex: 1},
  warning: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  warningText: {color: webWarning._100, flex: 1},
  danger: {backgroundColor: 'rgba(235, 84, 94, 0.12)'},
  dangerText: {color: webError._100, flex: 1},
  seedGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  seedCell: {
    // Three columns with two 12px gaps between them.
    width: '31%',
    flexGrow: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: webNeutral._800,
    overflow: 'hidden',
  },
  seedCellRevealed: {borderColor: webNeutral._600},
  seedIndex: {
    width: 32,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: webInput._100,
    borderRightWidth: 1,
    borderRightColor: webNeutral._800,
  },
  seedIndexText: {...webFonts.body6, color: '#808080'},
  seedWord: {
    ...monoFont,
    flex: 1,
    fontSize: 14,
    color: webNeutral._0,
    paddingHorizontal: 8,
  },
  seedWordHidden: {color: webNeutral._600},
  seedInput: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: webNeutral._800,
    overflow: 'hidden',
  },
  seedInputFilled: {borderColor: webNeutral._600},
  seedInputError: {borderColor: webError._200},
  seedInputLabel: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: webInput._100,
    borderRightWidth: 1,
    borderRightColor: webNeutral._800,
  },
  seedInputLabelError: {backgroundColor: 'rgba(224, 81, 112, 0.08)'},
  seedInputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 0,
    backgroundColor: webNeutral._900,
    color: webNeutral._100,
  },
  seedInputFieldError: {backgroundColor: webError._300},
  seedInputFieldCompact: {paddingHorizontal: 8},
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    gap: 4,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  tab: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: 40},
  tabSelected: {backgroundColor: 'rgba(0, 89, 255, 0.24)'},
  hold: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#212429',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  holdActive: {borderColor: '#1E3C71'},
  holdFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#0059FF52',
  },
});
