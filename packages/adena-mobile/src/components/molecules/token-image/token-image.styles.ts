import { makeStyles } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  clip: { overflow: 'hidden' },
  monogram: { backgroundColor: colors.background.pressed, alignItems: 'center', justifyContent: 'center' },
}));
