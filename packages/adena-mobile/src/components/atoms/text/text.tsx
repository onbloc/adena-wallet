import React, { ReactElement } from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

import { tabularNumbers, ThemeColors, typography, TypographyRole, useThemeColors } from '../../../theme';

export type TextColor = 'primary' | 'secondary' | 'inverse' | 'disabled' | 'success' | 'error' | 'warning';

const colorMap = (colors: ThemeColors): Record<TextColor, string> => ({
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  inverse: colors.text.inverse,
  disabled: colors.text.disabled,
  success: colors.status.success,
  error: colors.status.error,
  warning: colors.status.warning,
});

export interface TextProps extends RNTextProps {
  variant?: TypographyRole;
  color?: TextColor;
  align?: TextStyle['textAlign'];
  tabular?: boolean;
}

export const Text = ({ variant = 'body', color = 'primary', align, tabular, style, ...rest }: TextProps): ReactElement => {
  const colors = useThemeColors();

  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: colorMap(colors)[color], textAlign: align }, tabular && tabularNumbers, style]}
    />
  );
};
