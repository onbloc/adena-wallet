import React, { ReactElement } from 'react';
import QRCode from 'react-native-qrcode-svg';

import { colors } from '../../../theme';

export const QrCode = ({ value, size = 180 }: { value: string; size?: number }): ReactElement => (
  <QRCode value={value} size={size} color={colors.text.primary} backgroundColor={colors.background.surface} />
);
