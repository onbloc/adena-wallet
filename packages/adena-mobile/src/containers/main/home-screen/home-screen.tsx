import React, { ReactElement, useState } from 'react';

import { HomeTab, WalletHomePage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { useNftImages } from '../../../hooks/use-nft-images';
import { usePullToRefresh } from '../../../hooks/use-pull-to-refresh';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainTabScreenProps } from '../../../navigation/screen-props';
import { toAvatarColor } from '../../../presenters/account.presenter';
import { toAssetItem } from '../../../presenters/asset.presenter';
import { useNftCollectionsQuery } from '../../../queries/nft.queries';
import { NftService } from '../../../services/nft.service';
import { useSessionStore } from '../../../stores/session.store';
import { formatUSD, formatUSDChange } from '../../../utils/price';

export const HomeScreen = ({ navigation }: MainTabScreenProps<'Wallet'>): ReactElement => {
  const { account, network, address } = useWalletSnapshot();
  const wallet = useWalletAssets();
  const { nftService } = useContainer();

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
  const pull = usePullToRefresh(() => Promise.all([wallet.refetch(), collectionsQuery.refetch()]));

  const thumbnails = useNftImages(network, (collections.data ?? []).map(collection => ({
    key: collection.id,
    packagePath: collection.packagePath,
    nftId: collection.thumbnailNftId,
    enabled: tab === 'nfts' && collection.supportsTokenUri,
  })));

  // Portfolio value leads when prices exist; otherwise the native balance is the headline.
  const native = wallet.assets.find(asset => asset.token.isNative);
  const portfolio = wallet.portfolio;
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
      address={address}
      networkName={`${network.chainName} ${network.networkName}`}
      isTestnet={!network.isMainnet}
      headline={portfolio ? formatUSD(portfolio.usd) : native?.quantityLabel}
      headlineCaption={portfolio && changeAmount !== null && portfolio.change24h !== null
        ? `${formatUSDChange(changeAmount)} (${portfolio.change24h >= 0 ? '+' : ''}${portfolio.change24h.toFixed(2)}%) today`
        : undefined}
      headlineCaptionColor={changeAmount === null ? 'secondary' : changeAmount >= 0 ? 'success' : 'error'}
      headlineLoading={wallet.loading}
      error={wallet.error ? toErrorMessage(wallet.error) : undefined}
      assets={wallet.assets.map(toAssetItem)}
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
      onBuy={handleBuy}
      onSend={handleSend}
      onReceive={handleReceive}
    />
  );
};
