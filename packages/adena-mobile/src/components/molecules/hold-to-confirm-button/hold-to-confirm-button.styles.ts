import { makeStyles, radius, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(() => ({
  base: {
    height: sizes.control,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, opacity: 0.16 },
  label: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space8 },
}));
