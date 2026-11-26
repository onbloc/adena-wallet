import React, { ReactElement, useCallback, useMemo, useState } from 'react';

import { CardsPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { SESSION_COUNT_WARNING, SESSION_MAX_PER_ACCOUNT } from '../../../domain/session-card';
import { usePullToRefresh } from '../../../hooks/use-pull-to-refresh';
import { useCardTransaction } from '../../../hooks/use-reviewed-transaction';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainTabScreenProps } from '../../../navigation/screen-props';
import { orderTokenLookup, toOrderRowView } from '../../../presenters/order.presenter';
import { toRevokeAllReview, toSessionCardRowView } from '../../../presenters/session-card.presenter';
import { useOrdersQuery, useOrderTokensQuery } from '../../../queries/order.queries';
import { useSessionCardsQuery } from '../../../queries/session-card.queries';

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export const CardsScreen = ({ navigation }: MainTabScreenProps<'Cards'>): ReactElement => {
  const { sessionCardService, orderService, swapService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const supported = sessionCardService.isSupported(network);
  const query = useSessionCardsQuery(account, network);
  const cards = useMemo(() => query.data ?? [], [query.data]);
  const revokeAll = useCardTransaction('All cards revoked', () => undefined);
  const ordersSupported = orderService.isSupported(network);
  const ordersQuery = useOrdersQuery(account, network);
  const tokensQuery = useOrderTokensQuery(network);
  const [chooserVisible, setChooserVisible] = useState(false);
  const wrappedNativePath = swapService.getSwapConfig(network)?.wrappedNative.tokenPath;

  const orderRows = useMemo(() => {
    const lookup = orderTokenLookup(tokensQuery.data ?? [], wrappedNativePath);
    const now = nowSeconds();

    return (ordersQuery.data ?? []).map(order => toOrderRowView(order, lookup, now));
  }, [ordersQuery.data, tokensQuery.data, wrappedNativePath]);

  const rows = useMemo(() => {
    const now = nowSeconds();

    return cards.map(card => toSessionCardRowView(card, network, now));
  }, [cards, network]);

  const { refetch: refetchCards } = query;
  const { refetch: refetchOrders } = ordersQuery;
  const handleRefresh = useCallback((): Promise<unknown> => Promise.all([refetchCards(), refetchOrders()]), [refetchCards, refetchOrders]);
  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const notice = cards.length >= SESSION_COUNT_WARNING
    ? `${cards.length} of ${SESSION_MAX_PER_ACCOUNT} cards in use. Revoke cards you no longer need.`
    : revokeAll.notice;

  const handleCreate = (): void => navigation.navigate('CardCreate');

  const handleOpenCard = (sessionAddress: string): void => navigation.navigate('CardDetail', { sessionAddress });

  const handleOpenOrder = (key: string): void => {
    const [kind, id] = key.split(':') as ['dca' | 'limit', string];

    navigation.navigate('OrderDetail', { kind, id });
  };

  const handleOpenChooser = (): void => setChooserVisible(true);

  const handleCloseChooser = (): void => setChooserVisible(false);

  const handleCreateDca = (): void => navigation.navigate('OrderCreate', { kind: 'dca' });

  const handleCreateLimit = (): void => navigation.navigate('OrderCreate', { kind: 'limit' });

  const handleRevokeAll = (): void => {
    if (account) {
      revokeAll.start(() => sessionCardService.prepareRevokeAll(account, network));
    }
  };

  return (
    <CardsPage
      supported={supported}
      loading={supported && query.isPending && Boolean(account)}
      error={query.error ? toErrorMessage(query.error) : revokeAll.prepareError}
      cards={rows}
      notice={notice}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onCreate={handleCreate}
      onOpenCard={handleOpenCard}
      onRevokeAll={handleRevokeAll}
      preparingRevokeAll={revokeAll.preparing}
      revokeAll={{
        review: revokeAll.prepared ? { ...toRevokeAllReview(cards.length), fee: revokeAll.fee } : undefined,
        confirming: revokeAll.confirming,
        error: revokeAll.confirmError,
        onConfirm: revokeAll.confirm,
        onClose: revokeAll.close,
      }}
      ordersSupported={ordersSupported}
      ordersLoading={ordersSupported && ordersQuery.isPending && Boolean(account)}
      ordersError={ordersQuery.error ? toErrorMessage(ordersQuery.error) : undefined}
      orders={orderRows}
      onOpenOrder={handleOpenOrder}
      chooserVisible={chooserVisible}
      onOpenChooser={handleOpenChooser}
      onCloseChooser={handleCloseChooser}
      onCreateDca={handleCreateDca}
      onCreateLimit={handleCreateLimit}
    />
  );
};
