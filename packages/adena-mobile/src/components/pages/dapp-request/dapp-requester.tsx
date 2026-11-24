import React, { ReactElement } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { Text } from '../../atoms';

export interface DappRequesterProps {
  dappName?: string;
  // Callback origin declared by the request itself.
  origin?: string;
  // Android launching package reported by the system.
  callerPackage?: string;
  style?: StyleProp<ViewStyle>;
}

export const DappRequester = ({ dappName, origin, callerPackage, style }: DappRequesterProps): ReactElement => (
  <View style={style}>
    <Text variant='section'>{dappName}</Text>
    {origin ? <Text variant='meta' color='secondary' testID='dapp-origin'>{`Return to ${origin} · unverified`}</Text> : null}
    {callerPackage ? <Text variant='meta' color='secondary' testID='dapp-caller'>{`Opened by ${callerPackage} (reported by Android)`}</Text> : null}
    <Text variant='meta' color='secondary'>The name and return address are provided by the app. Confirm the details before approving.</Text>
  </View>
);
