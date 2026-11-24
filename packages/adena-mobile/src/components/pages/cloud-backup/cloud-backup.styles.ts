import { makeStyles, radius, spacing } from '../../../theme';

const BADGE_SIZE = 64;

export const useStyles = makeStyles(colors => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.space16 },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.circle,
    backgroundColor: colors.background.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, gap: spacing.space4 },
  items: { gap: spacing.space8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    minHeight: 60,
    paddingHorizontal: spacing.space20,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.subtle,
  },
  itemLabel: { flex: 1 },
  note: { flexDirection: 'row', gap: spacing.space12 },
  noteTexts: { flex: 1, gap: spacing.space4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.space32 },
  footer: { gap: spacing.space8 },
  strength: { marginTop: -spacing.space8, gap: spacing.space4 },
  meter: { flexDirection: 'row', gap: spacing.space4 },
  meterSegment: { flex: 1, height: 4, borderRadius: radius.circle, backgroundColor: colors.border.subtle },
}));
