import React, { ReactElement } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, Button, Icon, IconButton, Text, TextColor } from '../../atoms';
import {
  AddressRow,
  AssetRow,
  BalanceHeader,
  EmptyState,
  InlineAlert,
  NftCard,
  Tabs,
  TokenImage,
} from '../../molecules';
import { AssetItemView, NftCardView } from '../../view-models';
import { styles } from './wallet-home.styles';

export type HomeTab = 'tokens' | 'nfts';

export interface WalletHomePageProps {
  accountName: string;
  address: string;
  networkName: string;
  isTestnet: boolean;
  headline?: string;
  headlineCaption?: string;
  headlineCaptionColor?: TextColor;
  headlineLoading: boolean;
  error?: string;
  assets: AssetItemView[];
  collections: NftCardView[];
  nftSupported: boolean;
  nftLoading: boolean;
  tab: HomeTab;
  refreshing: boolean;
  onRefresh: () => void;
  onTabChange: (tab: HomeTab) => void;
  onCopyAddress: () => void;
  onOpenAccounts: () => void;
  onOpenSettings: () => void;
  onOpenNetworks: () => void;
  onOpenToken: (tokenId: string) => void;
  onOpenCollection: (collectionId: string) => void;
  onManageTokens: () => void;
  onSend: () => void;
  onReceive: () => void;
  onManageNfts: () => void;
}

const NftGrid = ({ collections, onOpen }: { collections: NftCardView[]; onOpen: (key: string) => void }): ReactElement => (
  <View style={styles.grid}>
    {collections.map((collection) => {
      const handlePress = (): void => onOpen(collection.key);

      return (
        <View key={collection.key} style={styles.gridCell}>
          <NftCard
            title={collection.title}
            subtitle={collection.subtitle}
            imageUri={collection.imageUri}
            imageLoading={collection.imageLoading}
            onPress={handlePress}
          />
        </View>
      );
    })}
  </View>
);

export const WalletHomePage = (props: WalletHomePageProps): ReactElement => (
  <SafeAreaView style={styles.root} edges={['top']}>
    <View style={styles.topBar}>
      <Pressable accessibilityRole='button' accessibilityLabel='Switch account' onPress={props.onOpenAccounts} style={styles.identity}>
        <Avatar name={props.accountName} />
        <Text variant='row' numberOfLines={1} style={styles.identityName}>{props.accountName}</Text>
        <Icon name='chevronDown' size={18} />
      </Pressable>
      <IconButton icon='globe' variant='surface' accessibilityLabel='Select network' onPress={props.onOpenNetworks} />
      <IconButton icon='settings' variant='surface' accessibilityLabel='Settings' onPress={props.onOpenSettings} />
    </View>
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}
    >
      <View style={styles.network}>
        <Badge label={props.networkName} tone={props.isTestnet ? 'warning' : 'neutral'} />
      </View>
      <BalanceHeader
        value={props.headline}
        caption={props.headlineCaption}
        captionColor={props.headlineCaptionColor}
        loading={props.headlineLoading}
      />
      <AddressRow address={props.address} onCopy={props.onCopyAddress} />
      {props.error && <InlineAlert tone='error' title='Unable to load balances' description={props.error} />}
      <View style={styles.actions}>
        <Button label='Send' tone='secondary' size='compact' style={styles.action} onPress={props.onSend} testID='home-send' />
        <Button label='Receive' tone='secondary' size='compact' style={styles.action} onPress={props.onReceive} testID='home-receive' />
      </View>
      <Tabs
        items={[{ key: 'tokens', label: 'Tokens' }, { key: 'nfts', label: 'NFTs' }]}
        selected={props.tab}
        onSelect={props.onTabChange}
      />
      {props.tab === 'tokens' && (
        <>
          {props.assets.map((asset) => {
            const handlePress = (): void => props.onOpenToken(asset.key);

            return (
              <AssetRow
                key={asset.key}
                name={asset.name}
                quantity={asset.quantity}
                value={asset.value}
                change={asset.change ? { label: asset.change, trend: asset.trend } : undefined}
                loading={asset.loading}
                icon={<TokenImage symbol={asset.symbol} localIcon={asset.localIcon} imageUrl={asset.imageUrl} />}
                onPress={handlePress}
              />
            );
          })}
          <Button label='Manage tokens' tone='tertiary' size='compact' onPress={props.onManageTokens} />
        </>
      )}
      {props.tab === 'nfts' && (
        !props.nftSupported
          ? <EmptyState title='NFTs are not available' description='This network does not provide NFT data.' />
          : props.nftLoading
            ? <Text variant='meta' color='secondary' align='center' style={styles.loading}>Loading collectibles…</Text>
            : props.collections.length === 0
              ? <EmptyState title='No collectibles yet' />
              : <NftGrid collections={props.collections} onOpen={props.onOpenCollection} />
      )}
      {props.tab === 'nfts' && props.nftSupported && (
        <Button label='Manage NFTs' tone='tertiary' size='compact' onPress={props.onManageNfts} />
      )}
    </ScrollView>
  </SafeAreaView>
);
