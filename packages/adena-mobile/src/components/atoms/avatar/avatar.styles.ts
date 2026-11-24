import { fixedColors, makeStyles, radius } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  base: {
    borderRadius: radius.circle,
    backgroundColor: colors.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  onColor: { color: fixedColors.white },
}));
