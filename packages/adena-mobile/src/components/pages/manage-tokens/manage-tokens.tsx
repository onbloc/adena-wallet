import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Switch, Text } from '../../atoms';
import { Screen, SearchField, TokenImage, TopBar } from '../../molecules';
import { AssetItemView } from '../../view-models';
import { useStyles } from './manage-tokens.styles';

export interface ManagedTokenView extends AssetItemView {
  visible: boolean;
  locked: boolean;
}

export interface ManageTokensPageProps {
  query: string;
  onChangeQuery: (value: string) => void;
  tokens: ManagedTokenView[];
  onToggle: (tokenId: string, visible: boolean) => void;
  onAddToken?: () => void;
  onBack: () => void;
}

export const ManageTokensPage = ({ query, onChangeQuery, tokens, onToggle, onAddToken, onBack }: ManageTokensPageProps): ReactElement => {
  const styles = useStyles();

  return (
    <Screen
      header={<TopBar title='Manage tokens' onBack={onBack} />}
      footer={onAddToken && <Button label='Add custom token' leadingIcon='plus' tone='secondary' onPress={onAddToken} />}
    >
      <SearchField value={query} onChangeText={onChangeQuery} placeholder='Search tokens' />
      {tokens.map((token) => {
        const handleValueChange = (value: boolean): void => onToggle(token.key, value);

        return (
          <View key={token.key} style={styles.row}>
            <TokenImage symbol={token.symbol} localIcon={token.localIcon} imageUrl={token.imageUrl} />
            <View style={styles.texts}>
              <Text variant='row' numberOfLines={1}>{token.name}</Text>
              <Text variant='meta' color='secondary' numberOfLines={1}>{token.quantity ?? token.symbol}</Text>
            </View>
            <Switch
              value={token.visible}
              disabled={token.locked}
              accessibilityLabel={`Show ${token.symbol}`}
              onValueChange={handleValueChange}
            />
          </View>
        );
      })}
    </Screen>
  );
};
