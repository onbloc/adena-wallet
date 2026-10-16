import {StyleSheet} from 'react-native';

import {colors, colorTokens, fonts} from './theme';

/** Same keyboard hardening as Field: nothing typed is learned or suggested. */
export const INPUT_PROPS = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'off',
  spellCheck: false,
  importantForAutofill: 'no',
  keyboardAppearance: 'dark',
  placeholderTextColor: colors.textMuted,
  selectionColor: colors.primary,
} as const;

const {neutral, red} = colorTokens;

/** The transfer-input pill box (recipient, amount, memo) and its parts. */
export const formBox = StyleSheet.create({
  group: {gap: 6},
  box: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: neutral._9,
    borderWidth: 1,
    borderColor: neutral._7,
    borderRadius: 30,
  },
  boxError: {borderColor: red._5},
  input: {
    ...fonts.body2Reg,
    flex: 1,
    color: colors.text,
    paddingVertical: 4,
  },
  /** The one-line amount field: see inputFont. */
  inputSingleLine: {lineHeight: undefined},
  pill: {
    height: 25,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: neutral._7,
    justifyContent: 'center',
  },
  pillPressed: {backgroundColor: neutral.b},
  pillText: {...fonts.body3Bold, lineHeight: 16, color: colors.text},
  errorText: {...fonts.captionReg, color: red._5, paddingHorizontal: 16},
});
