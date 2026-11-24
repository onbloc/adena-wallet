import { StyleSheet } from 'react-native';

import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay.scrim },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.space24,
    paddingTop: spacing.space8,
    gap: spacing.space8,
    flexShrink: 1,
  },
  keyboardAvoider: { maxHeight: '90%' },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.circle,
    backgroundColor: colors.border.input,
    marginBottom: spacing.space8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space12 },
  title: { flex: 1 },
  content: { marginTop: spacing.space8, gap: spacing.space12 },
}));
