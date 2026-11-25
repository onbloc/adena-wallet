import React, { ReactElement } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { fixedColors, radius } from '../../../theme';

// Dark modules on a white quiet zone in every theme, so scanners read it on a dark sheet too.
export const QrCode = ({ value, size = 180 }: { value: string; size?: number }): ReactElement => {
  const quietZone = Math.round(size * 0.07);

  return (
    <View style={{ padding: quietZone, borderRadius: radius.smallControl, backgroundColor: fixedColors.white }}>
      <QRCode value={value} size={size - quietZone * 2} color={fixedColors.black} backgroundColor={fixedColors.white} />
    </View>
  );
};
