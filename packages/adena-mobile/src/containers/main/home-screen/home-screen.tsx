import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useState } from 'react';

import { HomeTab, WalletHomePage } from '../../../components/pages';
import { FEATURES } from '../../../config/features';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { useNftImages } from '../../../hooks/use-nft-images';
import { usePreference } from '../../../hooks/use-preference';
import { usePullToRefresh } from '../../../hooks/use-pull-to-refresh';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainTabScreenProps } from '../../../navigation/screen-props';
import { toAvatarColor } from '../../../presenters/account.presenter';
import { filterPortfolioAssets, toAssetItem } from '../../../presenters/asset.presenter';
import { refetchUnresolvedNftUris, useNftCollectionsQuery } from '../../../queries/nft.queries';
import { NftService } from '../../../services/nft.service';
import { useSessionStore } from '../../../stores/session.store';
import { formatUSD, formatUSDChange } from '../../../utils/price';

const MAX_PLACEHOLDER_ROWS = 6;

export const HomeScreen = ({ navigation }: MainTabScreenProps<'Wallet'>): ReactElement => {
  const { account, network, address } = useWalletSnapshot();
  const wallet = useWalletAssets();
  const hideSmallBalances = usePreference('hideSmallBalances');
  const hideUnknownTokens = usePreference('hideUnknownTokens');
  const { nftService, accountPhotoService } = useContainer();

  useSessionStore(state => state.revision);
  const collectionsQuery = useNftCollectionsQuery(account, network);
  const collections = {
    ...collectionsQuery,
    data: collectionsQuery.data && account
      ? NftService.arrange(collectionsQuery.data, nftService.getPreferences(account, network))
      : collectionsQuery.data,
  };
  const copy = useCopyToClipboard();
  const [tab, setTab] = useState<HomeTab>('tokens');
  const queryClient = useQueryClient();
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const pull = usePullToRefresh(() => {
    setImageRetryKey(key => key + 1);
    return Promise.all([wallet.refetch(), collectionsQuery.refetch(), refetchUnresolvedNftUris(queryClient, network.id)]);
  });

  const thumbnails = useNftImages(network, (collections.data ?? []).map(collection => ({
    key: collection.id,
    packagePath: collection.packagePath,
    nftId: collection.thumbnailNftId,
    enabled: tab === 'nfts' && collection.supportsTokenUri,
  })));

  // Portfolio value leads when prices exist; otherwise the native balance is the headline.
  // The header waits for prices too, so it never shows the native balance and then jumps to USD.
  const assetsLoading = wallet.status === 'loading';
  const headlineLoading = assetsLoading || wallet.pricesLoading;
  const native = wallet.assets.find(asset => asset.token.isNative);
  // The total keeps every visible token; the filters only declutter the list.
  const portfolio = wallet.portfolio;
  const listedAssets = filterPortfolioAssets(wallet.assets, wallet.tokens, { hideSmallBalances, hideUnknownTokens });
  const changeAmount = portfolio && portfolio.change24h !== null
    ? portfolio.usd - portfolio.usd / (1 + portfolio.change24h / 100)
    : null;

  const ownedTotal = (collections.data ?? []).reduce((sum, collection) => sum + collection.ownedCount, 0);
  const collectionCount = collections.data?.length ?? 0;
  const nftSummary = collectionCount > 0
    ? `${ownedTotal} ${ownedTotal === 1 ? 'collectible' : 'collectibles'} · ${collectionCount} ${collectionCount === 1 ? 'collection' : 'collections'}`
    : undefined;

  const handleCopyAddress = (): void => copy(address);

  const handleOpenAccounts = (): void => navigation.navigate('Accounts');

  const handleOpenSettings = (): void => navigation.navigate('Settings');

  const handleScan = (): void => navigation.navigate('QrScanner');

  const handleOpenToken = (tokenId: string): void => navigation.navigate('TokenDetails', { tokenId });

  const handleOpenCollection = (collectionId: string): void => {
    const collection = collections.data?.find(item => item.id === collectionId);

    if (collection) {
      navigation.navigate('NftCollection', { collection });
    }
  };

  const handleManageTokens = (): void => navigation.navigate('ManageTokens');

  const handleManageNfts = (): void => navigation.navigate('ManageNfts');

  const handleBuy = (): void => navigation.navigate('BuyCrypto');

  const handleSend = (): void => navigation.navigate('SendRecipient');

  const handleReceive = (): void => navigation.navigate('Receive');

  const handleRetryNfts = (): void => {
    collectionsQuery.refetch();
  };

  return (
    <WalletHomePage
      accountName={account?.name ?? ''}
      accountAvatarColor={toAvatarColor(account)}
      accountAvatarPhoto={account ? accountPhotoService.get(account.id) : undefined}
      address={address}
      networkName={`${network.chainName} ${network.networkName}`}
      isTestnet={!network.isMainnet}
      headline={portfolio ? formatUSD(portfolio.usd) : native?.quantityLabel}
      headlineCaption={portfolio && changeAmount !== null && portfolio.change24h !== null
        ? `${formatUSDChange(changeAmount)} (${portfolio.change24h >= 0 ? '+' : ''}${portfolio.change24h.toFixed(2)}%) today`
        : undefined}
      headlineCaptionColor={changeAmount === null ? 'secondary' : changeAmount >= 0 ? 'success' : 'error'}
      headlineLoading={headlineLoading}
      error={wallet.error ? toErrorMessage(wallet.error) : undefined}
      assetsLoading={assetsLoading}
      assetPlaceholderCount={Math.min(wallet.tokens.length, MAX_PLACEHOLDER_ROWS)}
      assets={listedAssets.map(toAssetItem)}
      collections={(collections.data ?? []).map(collection => ({
        key: collection.id,
        title: collection.name,
        subtitle: `${collection.ownedCount} owned`,
        imageUri: thumbnails[collection.id]?.uri,
        imageLoading: thumbnails[collection.id]?.loading ?? false,
      }))}
      nftSummary={nftSummary}
      nftSupported={Boolean(network.apiUrl)}
      nftLoading={collections.isPending && collections.fetchStatus !== 'idle'}
      nftError={collectionsQuery.error ? toErrorMessage(collectionsQuery.error) : undefined}
      onRetryNfts={handleRetryNfts}
      tab={tab}
      refreshing={pull.refreshing}
      imageRetryKey={imageRetryKey}
      onRefresh={pull.onRefresh}
      onTabChange={setTab}
      onCopyAddress={handleCopyAddress}
      onOpenAccounts={handleOpenAccounts}
      onOpenSettings={handleOpenSettings}
      onScan={handleScan}
      onOpenToken={handleOpenToken}
      onOpenCollection={handleOpenCollection}
      onManageTokens={handleManageTokens}
      onManageNfts={handleManageNfts}
      onBuy={FEATURES.buy ? handleBuy : undefined}
      onSend={handleSend}
      onReceive={handleReceive}
    />
  );
};
