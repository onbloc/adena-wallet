import { Platform } from 'react-native';

import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  message: { borderRadius: radius.input, backgroundColor: colors.background.subtle, padding: spacing.space12, gap: spacing.space4 },
  file: { gap: spacing.space4, paddingTop: spacing.space4 },
  fileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space8 },
  fileName: { flex: 1 },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.primary,
    // Canvas sits darker than the message card in dark mode and matches the surface in light.
    backgroundColor: colors.background.canvas,
    borderRadius: radius.input,
    padding: spacing.space8,
  },
}));
