import { Platform, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  message: { borderRadius: radius.input, backgroundColor: colors.background.subtle, padding: spacing.space12, gap: spacing.space4 },
  file: { gap: spacing.space4, paddingTop: spacing.space4 },
  fileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space8 },
  fileName: { flex: 1 },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.primary,
    backgroundColor: colors.background.surface,
    borderRadius: radius.input,
    padding: spacing.space8,
  },
});
