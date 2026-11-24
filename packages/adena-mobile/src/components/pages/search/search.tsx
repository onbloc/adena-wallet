import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { LocalTokenIcon } from '../../../domain/token';
import { formatAddress } from '../../../utils/address';
import { Avatar, Chip, Text } from '../../atoms';
import { Dialog, EmptyState, ListRow, NftImage, Screen, SearchField, TokenImage, TopBar } from '../../molecules';
import { styles } from './search.styles';

export interface SearchTokenView {
  key: string;
  name: string;
  symbol: string;
  localIcon?: LocalTokenIcon;
  imageUrl?: string;
  // e.g. "GNOT" or "GNOT · Gno.land Testnet" for another network.
  caption: string;
}

export interface SearchWalletView {
  key: string;
  name: string;
  address: string;
  avatarColor?: string;
  avatarPhoto?: string;
}

export interface SearchCollectionView {
  key: string;
  name: string;
  caption: string;
  imageUri?: string | null;
  imageLoading: boolean;
}

export interface NetworkSwitchPrompt {
  title: string;
  description: string;
}

export interface SearchPageProps {
  query: string;
  onChangeQuery: (value: string) => void;
  // Current scope, e.g. "All networks" or "Gno.land Mainnet"; tapping toggles it.
  scopeLabel: string;
  onToggleScope: () => void;
  // False while the input is empty, so the page shows a hint instead of results.
  searching: boolean;
  tokens: SearchTokenView[];
  wallets: SearchWalletView[];
  collections: SearchCollectionView[];
  onOpenToken: (key: string) => void;
  onOpenWallet: (key: string) => void;
  onOpenCollection: (key: string) => void;
  networkSwitch?: NetworkSwitchPrompt;
  onConfirmNetworkSwitch: () => void;
  onCancelNetworkSwitch: () => void;
  onBack: () => void;
}

const Section = ({ title, children }: { title: string; children: ReactElement[] }): ReactElement => (
  <View style={styles.section}>
    <Text variant='section' accessibilityRole='header'>{title}</Text>
    {children}
  </View>
);

export const SearchPage = (props: SearchPageProps): ReactElement => {
  const empty = props.tokens.length === 0 && props.wallets.length === 0 && props.collections.length === 0;

  return (
    <Screen header={<TopBar title='Search' onBack={props.onBack} />}>
      <SearchField
        value={props.query}
        onChangeText={props.onChangeQuery}
        placeholder='Tokens, wallets or collections'
        autoFocus
        returnKeyType='search'
        testID='search-input'
      />
      <View style={styles.resultsHeader}>
        <Text variant='row' accessibilityRole='header'>Search results</Text>
        <Chip label={props.scopeLabel} onPress={props.onToggleScope} />
      </View>
      {!props.searching && (
        <EmptyState title='Search your wallet' description='Find tokens, saved wallets and NFT collections by name, symbol or address.' />
      )}
      {props.searching && empty && (
        <EmptyState title={`No results for "${props.query.trim()}"`} description='Check the spelling or search all networks.' />
      )}
      {props.searching && props.tokens.length > 0 && (
        <Section title='Tokens'>
          {props.tokens.map((token) => {
            const handlePress = (): void => props.onOpenToken(token.key);

            return (
              <ListRow
                key={token.key}
                leading={<TokenImage symbol={token.symbol} localIcon={token.localIcon} imageUrl={token.imageUrl} />}
                label={token.name}
                description={token.caption}
                onPress={handlePress}
              />
            );
          })}
        </Section>
      )}
      {props.searching && props.wallets.length > 0 && (
        <Section title='Wallets'>
          {props.wallets.map((wallet) => {
            const handlePress = (): void => props.onOpenWallet(wallet.key);

            return (
              <ListRow
                key={wallet.key}
                leading={<Avatar name={wallet.name} color={wallet.avatarColor} imageUri={wallet.avatarPhoto} />}
                label={wallet.name}
                description={formatAddress(wallet.address)}
                onPress={handlePress}
              />
            );
          })}
        </Section>
      )}
      {props.searching && props.collections.length > 0 && (
        <Section title='NFT collections'>
          {props.collections.map((collection) => {
            const handlePress = (): void => props.onOpenCollection(collection.key);

            return (
              <ListRow
                key={collection.key}
                leading={collection.imageUri || collection.imageLoading
                  ? <View style={styles.collectionThumbnail}><NftImage uri={collection.imageUri} loading={collection.imageLoading} /></View>
                  : <Avatar name={collection.name} />}
                label={collection.name}
                description={collection.caption}
                onPress={handlePress}
              />
            );
          })}
        </Section>
      )}
      <Dialog
        visible={Boolean(props.networkSwitch)}
        title={props.networkSwitch?.title ?? ''}
        description={props.networkSwitch?.description}
        confirmLabel='Switch'
        onConfirm={props.onConfirmNetworkSwitch}
        onCancel={props.onCancelNetworkSwitch}
      />
    </Screen>
  );
};
