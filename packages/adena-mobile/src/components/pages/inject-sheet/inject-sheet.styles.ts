import { StyleSheet } from 'react-native';

import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay.scrim },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.space24,
    paddingTop: spacing.space8,
    gap: spacing.space12,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: radius.circle, backgroundColor: colors.border.input },
  body: { flexGrow: 0 },
  bodyContent: { gap: spacing.space8 },
  origin: { gap: 2, paddingBottom: spacing.space4 },
  actions: { flexDirection: 'row', gap: spacing.space8 },
  action: { flex: 1 },
}));
