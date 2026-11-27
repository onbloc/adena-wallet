import { makeStyles, spacing } from '../../../theme';

export const useStyles = makeStyles(() => ({
  list: { flex: 1 },
  listContent: { flexGrow: 1, gap: spacing.space16, paddingBottom: spacing.space16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.space12, paddingVertical: spacing.space32 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.space8, marginTop: spacing.space8 },
  banner: { gap: spacing.space8 },
  trailing: { flexDirection: 'row' },
}));
