import { makeStyles, radius } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  frame: { aspectRatio: 1, borderRadius: radius.input, overflow: 'hidden', backgroundColor: colors.background.subtle },
  fill: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
}));
