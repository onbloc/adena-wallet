import { makeStyles, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  root: { flex: 1, backgroundColor: colors.background.canvas },
  topBar: { height: sizes.topBar, flexDirection: 'row', alignItems: 'center', gap: spacing.space8, paddingHorizontal: sizes.screenInset },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.space8, minHeight: sizes.touchTarget },
  identityName: { flexShrink: 1 },
  content: { paddingHorizontal: sizes.screenInset, paddingTop: sizes.contentTop, gap: spacing.space12 },
  network: { flexDirection: 'row' },
  actions: { flexDirection: 'row', gap: spacing.space12, marginTop: spacing.space8 },
  action: { flex: 1 },
  assetList: { gap: spacing.space12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.space16 },
  gridCell: { width: '48%' },
  loading: { paddingVertical: spacing.space32 },
}));
