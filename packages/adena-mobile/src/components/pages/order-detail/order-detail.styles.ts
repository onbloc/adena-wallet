import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  body: { gap: spacing.space20 },
  hero: { gap: spacing.space16, padding: spacing.space20, borderRadius: radius.sheet, backgroundColor: colors.background.subtle },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  heroTitle: { flex: 1, gap: 2 },
  iconCircle: { width: 40, height: 40, borderRadius: radius.circle, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.surface },
  pill: { paddingHorizontal: spacing.space12, paddingVertical: spacing.space4, borderRadius: radius.circle, backgroundColor: colors.background.surface },
  bold: { fontFamily: 'Inter-SemiBold' },
  segments: { flexDirection: 'row', gap: spacing.space4 },
  segment: { flex: 1, height: 8, borderRadius: radius.circle, backgroundColor: colors.border.subtle },
  segmentDone: { backgroundColor: colors.action.primary },
  track: { height: 6, borderRadius: radius.circle, backgroundColor: colors.border.subtle, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.circle, backgroundColor: colors.action.primary },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.space8 },
  rows: { gap: spacing.space12 },
  note: { flexDirection: 'row', gap: spacing.space8, alignItems: 'flex-start' },
  noteGlyph: { color: colors.icon.secondary },
  noteText: { flex: 1 },
  footerBlock: { gap: spacing.space12 },
  footer: { flexDirection: 'row', gap: spacing.space12 },
  footerButton: { flex: 1 },
}));
