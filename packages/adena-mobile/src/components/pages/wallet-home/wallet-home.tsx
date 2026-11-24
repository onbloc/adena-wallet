import React, { ReactElement } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, Button, IconButton, Text, TextColor } from '../../atoms';
import {
  AddressRow,
  AssetRow,
  AssetRowSkeleton,
  BalanceHeader,
  EmptyState,
  InlineAlert,
  NftCard,
  Tabs,
  TokenImage,
  useFloatingNavigationClearance,
} from '../../molecules';
import { AssetItemView, NftCardView } from '../../view-models';
import { styles } from './wallet-home.styles';

export type HomeTab = 'tokens' | 'nfts';

export interface WalletHomePageProps {
  accountName: string;
  accountAvatarColor?: string;
  accountAvatarPhoto?: string;
  address: string;
  networkName: string;
  isTestnet: boolean;
  headline?: string;
  headlineCaption?: string;
  headlineCaptionColor?: TextColor;
  headlineLoading: boolean;
  error?: string;
  // Until the list and balances are in, a skeleton list replaces the rows.
  assetsLoading?: boolean;
  assetPlaceholderCount?: number;
  assets: AssetItemView[];
  collections: NftCardView[];
  // Caption above the NFT grid, e.g. "3 collectibles · 2 collections".
  nftSummary?: string;
  nftSupported: boolean;
  nftLoading: boolean;
  // Load failure with nothing to show; replaces the empty state with a retry.
  nftError?: string;
  onRetryNfts?: () => void;
  tab: HomeTab;
  refreshing: boolean;
  // Bumped per refresh so artwork that failed to render is tried again.
  imageRetryKey?: number;
  onRefresh: () => void;
  onTabChange: (tab: HomeTab) => void;
  onCopyAddress: () => void;
  onOpenAccounts: () => void;
  onOpenSettings: () => void;
  onScan: () => void;
  onOpenToken: (tokenId: string) => void;
  onOpenCollection: (collectionId: string) => void;
  onManageTokens: () => void;
  // Buy is shown disabled when omitted.
  onBuy?: () => void;
  onSend: () => void;
  onReceive: () => void;
  onManageNfts: () => void;
}

const NftGrid = ({ collections, imageRetryKey, onOpen }: { collections: NftCardView[]; imageRetryKey?: number; onOpen: (key: string) => void }): ReactElement => (
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
            imageRetryKey={imageRetryKey}
            onPress={handlePress}
          />
        </View>
      );
    })}
  </View>
);

const DEFAULT_PLACEHOLDER_ROWS = 3;

const AssetListSkeleton = ({ count }: { count: number }): ReactElement => (
  <View accessibilityLabel='Loading tokens' accessibilityState={{ busy: true }} style={styles.assetList}>
    {Array.from({ length: count }, (_, index) => <AssetRowSkeleton key={index} />)}
  </View>
);

export const WalletHomePage = (props: WalletHomePageProps): ReactElement => {
  const bottomClearance = useFloatingNavigationClearance();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole='button' accessibilityLabel='Switch account' onPress={props.onOpenAccounts} style={styles.identity}>
          <Avatar name={props.accountName} color={props.accountAvatarColor} imageUri={props.accountAvatarPhoto} />
          <Text variant='row' numberOfLines={1} style={styles.identityName}>{props.accountName}</Text>
        </Pressable>
        <IconButton icon='scan' variant='surface' accessibilityLabel='Scan QR code' onPress={props.onScan} />
        <IconButton icon='settings' variant='surface' accessibilityLabel='Settings' onPress={props.onOpenSettings} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
        keyboardShouldPersistTaps='handled'
        refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}
      >
        {props.isTestnet && (
          <View style={styles.network}>
            <Badge label={props.networkName} tone='warning' />
          </View>
        )}
        <BalanceHeader
          value={props.headline}
          caption={props.headlineCaption}
          captionColor={props.headlineCaptionColor}
          loading={props.headlineLoading}
        />
        <AddressRow address={props.address} onCopy={props.onCopyAddress} />
        {props.error && <InlineAlert tone='error' title='Unable to load balances' description={props.error} />}
        <View style={styles.actions}>
          <Button label='Buy' tone='secondary' size='compact' style={styles.action} disabled={!props.onBuy} onPress={props.onBuy} testID='home-buy' />
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
            {props.assetsLoading && <AssetListSkeleton count={props.assetPlaceholderCount || DEFAULT_PLACEHOLDER_ROWS} />}
            {!props.assetsLoading && props.assets.map((asset) => {
              const handlePress = (): void => props.onOpenToken(asset.key);

              return (
                <AssetRow
                  key={asset.key}
                  name={asset.name}
                  quantity={asset.quantity}
                  value={asset.value}
                  change={asset.change ? { label: asset.change, trend: asset.trend } : undefined}
                  loading={asset.loading}
                  valueLoading={asset.valueLoading}
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
                ? props.nftError
                  ? <EmptyState title='Couldn’t load collectibles' description={props.nftError} actionLabel='Try again' onAction={props.onRetryNfts} />
                  : <EmptyState title='No collectibles yet' />
                : (
                    <>
                      {props.nftSummary && <Text variant='meta' color='secondary'>{props.nftSummary}</Text>}
                      <NftGrid collections={props.collections} imageRetryKey={props.imageRetryKey} onOpen={props.onOpenCollection} />
                    </>
                  )
        )}
        {props.tab === 'nfts' && props.nftSupported && (
          <Button label='Manage NFTs' tone='tertiary' size='compact' onPress={props.onManageNfts} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
