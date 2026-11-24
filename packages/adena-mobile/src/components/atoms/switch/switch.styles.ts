import { StyleSheet } from 'react-native';

import { radius } from '../../../theme';

export const TRACK_WIDTH = 40;
export const TRACK_HEIGHT = 24;
export const OFFSET = 3;
export const THUMB = 18;

export const styles = StyleSheet.create({
  track: { width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: radius.circle, padding: OFFSET, justifyContent: 'center' },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.circle },
});
