import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';
import { Linking } from 'react-native';

import { ActivityDetailPage } from '../../../components/pages';
import { AmountTone } from '../../../components/view-models';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { MainStackParamList } from '../../../navigation/types';
import { formatActivityAmount, formatDateTime, toActivityView } from '../../../presenters/activity.presenter';
import { useToastStore } from '../../../stores/toast.store';
import { formatAddress, formatHash } from '../../../utils/address';
import { explorerName, transactionExplorerUrl } from '../../../utils/explorer';

export const ActivityDetailScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'ActivityDetail'>): ReactElement => {
  const { activity } = route.params;
  const { allTokens, network } = useWalletAssets();
  const copy = useCopyToClipboard();
  const showToast = useToastStore(state => state.show);
  const view = toActivityView(activity, allTokens);
  const explorerUrl = transactionExplorerUrl(network, activity.hash);

  const addressRow = (label: string, address: string): { label: string; value: string; onCopy: () => void; copyLabel: string } => ({
    label,
    value: formatAddress(address),
    onCopy: (): void => copy(address),
    copyLabel: `Copy ${label.toLowerCase()} address`,
  });

  const rows = [
    { label: 'Date', value: formatDateTime(activity.timestamp) ?? '-' },
    { label: 'Type', value: activity.typeName ?? activity.title },
    ...(activity.from ? [addressRow('From', activity.from)] : []),
    ...(activity.to ? [addressRow('To', activity.to)] : []),
    ...(activity.networkFee ? [{ label: 'Network fee', value: formatActivityAmount(activity.networkFee, allTokens) }] : []),
    { label: 'Network', value: network.networkName },
    ...(activity.height ? [{ label: 'Block', value: String(activity.height) }] : []),
    {
      label: 'Transaction hash',
      value: formatHash(activity.hash),
      onCopy: (): void => copy(activity.hash, 'Transaction hash copied'),
      copyLabel: 'Copy transaction hash',
    },
  ];

  const handleOpenExplorer = (url: string): void => {
    Linking.openURL(url).catch(() => showToast(`Couldn’t open ${explorerName(network)}`, 'error'));
  };

  return (
    <ActivityDetailPage
      title={activity.extraInfo ? `${activity.title} ${activity.extraInfo}` : activity.title}
      amountLabel={view.amountLabel}
      amountColor={view.tone === AmountTone.POSITIVE ? 'success' : view.tone === AmountTone.MUTED ? 'disabled' : 'primary'}
      status={view.statusLabel}
      rows={rows}
      onOpenExplorer={explorerUrl ? (): void => handleOpenExplorer(explorerUrl) : undefined}
      explorerName={explorerName(network)}
      onBack={navigation.goBack}
    />
  );
};
