import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  tiles: { flexDirection: 'row', gap: spacing.space8 },
  tile: { flex: 1, gap: spacing.space8, padding: spacing.space16, borderRadius: radius.sheet, backgroundColor: colors.background.subtle },
  section: { gap: spacing.space8 },
  sectionTitle: { fontFamily: 'Inter-SemiBold' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space8 },
  restriction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingLeft: spacing.space8,
    paddingRight: spacing.space12,
    paddingVertical: spacing.space8,
    borderRadius: radius.circle,
    backgroundColor: colors.background.subtle,
  },
  restrictionIcon: { width: 22, height: 22, borderRadius: radius.circle, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDE7E5' },
  restrictionGlyph: { color: colors.status.error },
  chipText: { fontFamily: 'Inter-SemiBold' },
  assurances: { gap: spacing.space12 },
  assurance: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  assuranceIcon: { width: 22, height: 22, borderRadius: radius.circle, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF3EA' },
  assuranceGlyph: { color: colors.status.success },
}));
