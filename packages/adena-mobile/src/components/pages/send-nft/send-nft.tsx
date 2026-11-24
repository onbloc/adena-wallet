import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { formatAddress } from '../../../utils/address';
import { Avatar, Button, Text } from '../../atoms';
import { InlineAlert, ListRow, NftImage, RecipientField, ReviewSheet, ReviewSheetProps, Screen, SectionLabel, TopBar } from '../../molecules';
import { RecipientItem } from '../send-recipient';
import { styles } from './send-nft.styles';

export interface SendNftPageProps {
  title: string;
  collectionName: string;
  imageUri?: string | null;
  recipient: string;
  onChangeRecipient: (value: string) => void;
  onScanRecipient: () => void;
  recipientError?: string;
  suggestions: RecipientItem[];
  onSelectSuggestion: (address: string) => void;
  canReview: boolean;
  preparing: boolean;
  prepareError?: string;
  onReview: () => void;
  review: Omit<ReviewSheetProps, 'title' | 'confirmLabel'>;
  onBack: () => void;
}

export const SendNftPage = (props: SendNftPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Send NFT' onBack={props.onBack} />}
    footer={<Button label='Review transfer' loadingLabel='Estimating fee…' disabled={!props.canReview} loading={props.preparing} onPress={props.onReview} />}
  >
    <View style={styles.preview}>
      <NftImage uri={props.imageUri} size={72} />
      <View style={styles.names}>
        <Text variant='row'>{props.title}</Text>
        <Text variant='meta' color='secondary'>{props.collectionName}</Text>
      </View>
    </View>
    <RecipientField value={props.recipient} onChangeText={props.onChangeRecipient} onScan={props.onScanRecipient} placeholder='Recipient address' />
    {props.recipientError && <InlineAlert tone='error' title={props.recipientError} />}
    {props.prepareError && <InlineAlert tone='error' title='Unable to prepare the transfer' description={props.prepareError} />}
    {props.suggestions.length > 0 && <SectionLabel label='Suggestions' />}
    {props.suggestions.map((item) => {
      const handlePress = (): void => props.onSelectSuggestion(item.address);

      return (
        <ListRow
          key={item.key}
          leading={<Avatar name={item.label} />}
          label={item.label}
          description={formatAddress(item.address)}
          onPress={handlePress}
        />
      );
    })}
    <ReviewSheet {...props.review} title='Review NFT transfer' confirmLabel='Confirm send'>
      <Text variant='section' align='center'>{props.title}</Text>
    </ReviewSheet>
  </Screen>
);
