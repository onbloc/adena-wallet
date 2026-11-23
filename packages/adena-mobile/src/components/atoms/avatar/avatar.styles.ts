import { StyleSheet } from 'react-native';

import { colors, radius } from '../../../theme';

export const styles = StyleSheet.create({
  base: {
    borderRadius: radius.circle,
    backgroundColor: colors.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
