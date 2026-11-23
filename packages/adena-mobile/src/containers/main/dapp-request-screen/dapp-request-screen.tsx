import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useState } from 'react';
import { Linking } from 'react-native';

import { ErrorBoundary } from '../../../app/error-boundary';
import { DappRequestPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { DappMethod } from '../../../domain/dapp';
import { useDappRequestFlow } from '../../../hooks/use-dapp-request-flow';
import { MainStackParamList } from '../../../navigation/types';
import { queryKeys } from '../../../queries/query-keys';
import { useDappRequestStore } from '../../../stores/dapp-request.store';
import { useSessionStore } from '../../../stores/session.store';

type Props = NativeStackScreenProps<MainStackParamList, 'DappRequest'>;

const DappRequestContent = ({ navigation }: Props): ReactElement | null => {
  const { networkService } = useContainer();

  useSessionStore(state => state.revision);
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const queryClient = useQueryClient();
  const request = useDappRequestStore(state => state.active?.request ?? null);
  const { setActive, setInFlight } = useDappRequestStore.getState();
  const [switchDismissed, setSwitchDismissed] = useState(false);
  const flow = useDappRequestFlow(request, { allowCrossNetwork: false });

  // Clearing the active request lets the next queued one be presented.
  const finish = async (callbackUrl: string | null): Promise<void> => {
    setActive(null);

    if (navigation.canGoBack()) {
      navigation.goBack();
    }

    if (callbackUrl) {
      await Linking.openURL(callbackUrl).catch(() => undefined);
    }
  };

  if (!request) {
    return null;
  }

  const { context } = flow;
  const reject = (): Promise<void> => finish(flow.rejectionUrl());

  const handleApprove = async (): Promise<void> => {
    setInFlight(true);
    const callbackUrl = await flow.approve().catch(() => null);

    setInFlight(false);

    if (callbackUrl) {
      queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
      finish(callbackUrl);
    }
  };

  return (
    <DappRequestPage
      title={flow.title}
      dappName={request.dapp.name}
      origin={request.callbackOrigin}
      networkName={context?.network.networkName ?? request.chainId ?? '-'}
      accountName={context?.account.name ?? '-'}
      address={context?.address ?? '-'}
      messages={flow.messages}
      memo={request.method !== DappMethod.CONNECT ? request.memo : undefined}
      fee={flow.feeLabel}
      loading={flow.loading}
      error={flow.error}
      approveLabel={flow.approveLabel}
      approving={flow.approving}
      canApprove={flow.canApprove}
      onApprove={handleApprove}
      onReject={reject}
      networkSwitch={context && flow.needsSwitch
        ? {
            visible: !switchDismissed,
            networkName: context.network.networkName,
            onConfirm: (): void => {
              networkService.selectNetwork(context.network.id);
              bumpRevision();
            },
            onCancel: (): void => {
              setSwitchDismissed(true);
              reject();
            },
          }
        : undefined}
    />
  );
};

// A crash while reviewing answers the dApp with an error instead of leaving it waiting.
export const DappRequestScreen = (props: Props): ReactElement => {
  const { dappService } = useContainer();
  const failRequest = (error: unknown): void => {
    const { active, inFlight, setActive } = useDappRequestStore.getState();

    if (!active || inFlight) {
      return;
    }

    setActive(null);

    if (props.navigation.canGoBack()) {
      props.navigation.goBack();
    }

    Linking.openURL(dappService.fail(active.request, error instanceof Error ? error : new Error(String(error))))
      .catch(() => undefined);
  };

  const fallbackErrorBoundary = (): null => null;

  return (
    <ErrorBoundary fallback={fallbackErrorBoundary} onError={failRequest}>
      <DappRequestContent {...props} />
    </ErrorBoundary>
  );
};
