import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { EmptyState, InlineAlert, Screen, SearchField, SectionLabel, TokenImage, TopBar } from '../../molecules';
import { useStyles } from './add-token.styles';

export interface RegistryTokenView {
  key: string;
  symbol: string;
  name: string;
  imageUrl?: string;
  added: boolean;
}

export interface AddTokenPageProps {
  query: string;
  onChangeQuery: (value: string) => void;
  results: RegistryTokenView[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  loadingMore: boolean;
  addingKey?: string;
  onLoadMore: () => void;
  onAdd: (tokenId: string) => void;
  onBack: () => void;
}

export const AddTokenPage = (props: AddTokenPageProps): ReactElement => {
  const styles = useStyles();

  return (
    <Screen header={<TopBar title='Add custom token' onBack={props.onBack} />}>
      <SearchField value={props.query} onChangeText={props.onChangeQuery} placeholder='Name, symbol or gno.land/r/….SYMBOL' />
      <Text variant='meta' color='secondary'>Tokens are looked up in the on-chain GRC20 registry.</Text>
      {props.error && <InlineAlert tone='error' title={props.error} />}
      <SectionLabel label='Registry' />
      {!props.loading && props.results.length === 0 && <EmptyState title='No tokens found' />}
      {props.results.map((token) => {
        const handlePress = (): void => props.onAdd(token.key);

        return (
          <View key={token.key} style={styles.row}>
            <TokenImage symbol={token.symbol} imageUrl={token.imageUrl} />
            <View style={styles.texts}>
              <Text variant='row' numberOfLines={1}>{`${token.name} (${token.symbol})`}</Text>
              <Text variant='meta' color='secondary' numberOfLines={1}>{token.key}</Text>
            </View>
            <Button
              label={token.added ? 'Added' : 'Add'}
              tone={token.added ? 'tertiary' : 'primary'}
              size='compact'
              fullWidth={false}
              style={styles.action}
              disabled={token.added}
              loading={props.addingKey === token.key}
              loadingLabel='Adding'
              onPress={handlePress}
            />
          </View>
        );
      })}
      {props.hasMore && <Button label='Load more' tone='secondary' size='compact' loading={props.loadingMore} loadingLabel='Loading…' onPress={props.onLoadMore} />}
    </Screen>
  );
};
