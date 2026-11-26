import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo, useState } from 'react';

import { OrderDetailPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { useOrderTransaction } from '../../../hooks/use-reviewed-transaction';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { orderTokenLookup, toCancelReview, toClaimReview, toOrderDetailView } from '../../../presenters/order.presenter';
import { useOrdersQuery, useOrderTokensQuery } from '../../../queries/order.queries';
import { OrderAction } from '../../../services/order.service';

export const OrderDetailScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'OrderDetail'>): ReactElement => {
  const { kind, id } = route.params;
  const { orderService, swapService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const ordersQuery = useOrdersQuery(account, network);
  const tokensQuery = useOrderTokensQuery(network);
  const order = ordersQuery.data?.find(item => item.kind === kind && item.id === id);
  const lookup = useMemo(
    () => orderTokenLookup(tokensQuery.data ?? [], swapService.getSwapConfig(network)?.wrappedNative.tokenPath),
    [network, swapService, tokensQuery.data],
  );
  const view = useMemo(() => (order ? toOrderDetailView(order, lookup, Math.floor(Date.now() / 1000)) : undefined), [lookup, order]);
  const [message, setMessage] = useState('Done');
  const action = useOrderTransaction(message, prepared => (prepared.action === OrderAction.CANCEL ? navigation.goBack() : undefined));

  const handleClaim = (): void => {
    if (account && order) {
      setMessage('Claimed');
      action.start(() => orderService.prepareClaim(account, network, order));
    }
  };

  const handleCancel = (): void => {
    if (account && order) {
      setMessage('Order cancelled');
      action.start(() => orderService.prepareCancel(account, network, order));
    }
  };

  const prepared = action.prepared;
  const review = prepared?.order
    ? (prepared.action === OrderAction.CLAIM ? toClaimReview(prepared.order, lookup) : toCancelReview(prepared.order, lookup))
    : undefined;

  return (
    <OrderDetailPage
      order={view}
      loading={ordersQuery.isPending && Boolean(account)}
      missing={ordersQuery.isSuccess && !order}
      error={ordersQuery.error ? toErrorMessage(ordersQuery.error) : action.prepareError ?? action.notice}
      onBack={navigation.goBack}
      onClaim={handleClaim}
      onCancel={handleCancel}
      preparing={action.preparing}
      review={{
        review: review ? { ...review, fee: action.fee } : undefined,
        confirming: action.confirming,
        error: action.confirmError,
        onConfirm: action.confirm,
        onClose: action.close,
      }}
    />
  );
};
