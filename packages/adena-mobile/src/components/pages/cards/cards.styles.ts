import { makeStyles, radius, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  root: { flex: 1, backgroundColor: colors.background.canvas },
  content: { paddingHorizontal: sizes.screenInset, paddingTop: sizes.contentTop, flexGrow: 1 },
  sections: { gap: spacing.space32 },
  list: { gap: spacing.space12 },
  progressTrack: { height: 6, borderRadius: radius.circle, backgroundColor: colors.action.secondary, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.circle, backgroundColor: colors.action.primary },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.space8 },
  card: {
    gap: spacing.space16,
    padding: spacing.space16,
    borderRadius: radius.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.surface,
  },
  cardPressed: { backgroundColor: colors.background.pressed },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.subtle,
  },
  cardTitle: { flex: 1, gap: spacing.space4 / 2 },
}));
