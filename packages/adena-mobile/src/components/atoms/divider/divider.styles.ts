import { StyleSheet } from 'react-native';

import { makeStyles } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, alignSelf: 'stretch' },
}));
