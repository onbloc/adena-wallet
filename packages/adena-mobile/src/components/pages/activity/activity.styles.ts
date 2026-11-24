import { makeStyles, sizes } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  root: { flex: 1, backgroundColor: colors.background.canvas },
  content: { paddingHorizontal: sizes.screenInset, paddingTop: sizes.contentTop },
}));
