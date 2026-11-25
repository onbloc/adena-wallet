import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { useStyles } from './divider.styles';

export const Divider = (): ReactElement => <View style={useStyles().line} />;
