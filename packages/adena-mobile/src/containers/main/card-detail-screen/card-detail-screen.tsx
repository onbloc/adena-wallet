import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo } from 'react';

import { CardDetailPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { useCardTransaction } from '../../../hooks/use-reviewed-transaction';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toRevokeReview, toSessionCardDetailView } from '../../../presenters/session-card.presenter';
import { useSessionCardQuery } from '../../../queries/session-card.queries';

export const CardDetailScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'CardDetail'>): ReactElement => {
  const { sessionAddress } = route.params;
  const { sessionCardService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const query = useSessionCardQuery(account, network, sessionAddress);
  const copy = useCopyToClipboard();
  const revoke = useCardTransaction('Card revoked', () => navigation.goBack());
  const card = query.data ?? undefined;

  const view = useMemo(() => (card ? toSessionCardDetailView(card, network, Math.floor(Date.now() / 1000)) : undefined), [card, network]);

  const handleRevoke = (): void => {
    if (account && card) {
      revoke.start(() => sessionCardService.prepareRevoke(account, network, card));
    }
  };

  const handleCopyAddress = (): void => copy(sessionAddress, 'Card address copied');

  return (
    <CardDetailPage
      card={view}
      loading={query.isPending && Boolean(account)}
      missing={query.isSuccess && query.data === null}
      error={query.error ? toErrorMessage(query.error) : revoke.prepareError ?? revoke.notice}
      onBack={navigation.goBack}
      onCopyAddress={handleCopyAddress}
      onRevoke={handleRevoke}
      preparingRevoke={revoke.preparing}
      revoke={{
        review: revoke.prepared?.card ? { ...toRevokeReview(revoke.prepared.card), fee: revoke.fee } : undefined,
        confirming: revoke.confirming,
        error: revoke.confirmError,
        onConfirm: revoke.confirm,
        onClose: revoke.close,
      }}
    />
  );
};
