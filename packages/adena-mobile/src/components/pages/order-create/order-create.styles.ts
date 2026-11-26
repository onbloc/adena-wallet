import { makeStyles, spacing } from '../../../theme';

export const useStyles = makeStyles(() => ({
  body: { gap: spacing.space16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space8 },
  summary: { gap: spacing.space12, paddingTop: spacing.space8 },
  footer: { gap: spacing.space12 },
}));
