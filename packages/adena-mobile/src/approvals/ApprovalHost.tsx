import {WalletResponseFailureType} from '@adena-wallet/sdk';
import {InjectionMessageInstance} from '@inject/message/message';
import {RoutePath} from '@types';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Modal, StyleSheet, View} from 'react-native';

import {useWallet} from '../core/wallet-context';
import type {PendingApproval} from '../platform/approval-queue';
import {makeDismissedResponse} from '../platform/dismissed-response';
import type {MobilePlatform} from '../platform/install';
import {ReauthHost} from '../security/reauth';
import {Body, Screen} from '../ui/components';
import {colors} from '../ui/theme';
import {ApprovalTitle} from './approval-ui';
import {ConnectApproval} from './ConnectApproval';
import {
  CosmosConnectApproval,
  CosmosKeyApproval,
  CosmosSignApproval,
} from './CosmosApprovals';
import {NetworkApproval} from './NetworkApproval';
import {SignArbitraryApproval} from './SignArbitraryApproval';
import {TransactionApproval} from './TransactionApproval';
import type {ApprovalProps} from './types';

function ApprovalScreen(props: ApprovalProps) {
  switch (props.request.path) {
    case RoutePath.ApproveEstablish:
      return <ConnectApproval {...props} />;
    case RoutePath.ApproveTransaction:
      return <TransactionApproval {...props} mode="broadcast" />;
    case RoutePath.ApproveSignTransaction:
      return <TransactionApproval {...props} mode="sign" />;
    case RoutePath.ApproveSign:
      return <TransactionApproval {...props} mode="amino" />;
    case RoutePath.ApproveSignArbitrary:
      return <SignArbitraryApproval {...props} />;
    case RoutePath.ApproveChangingNetwork:
      return <NetworkApproval {...props} mode="switch" />;
    case RoutePath.ApproveAddingNetwork:
      return <NetworkApproval {...props} mode="add" />;
    case RoutePath.ApproveEstablishCosmos:
      return <CosmosConnectApproval {...props} />;
    case RoutePath.ApproveGetCosmosKey:
      return <CosmosKeyApproval {...props} />;
    case RoutePath.ApproveSignCosmos:
      return (
        <CosmosSignApproval
          {...props}
          mode={
            (props.request.message.type as string) === 'SIGN_COSMOS_DIRECT'
              ? 'direct'
              : 'amino'
          }
        />
      );
    default:
      return null;
  }
}

const SUPPORTED = new Set<string>([
  RoutePath.ApproveEstablish,
  RoutePath.ApproveTransaction,
  RoutePath.ApproveSignTransaction,
  RoutePath.ApproveSign,
  RoutePath.ApproveSignArbitrary,
  RoutePath.ApproveChangingNetwork,
  RoutePath.ApproveAddingNetwork,
  RoutePath.ApproveEstablishCosmos,
  RoutePath.ApproveGetCosmosKey,
  RoutePath.ApproveSignCosmos,
]);

/** Shows the head of the approval queue as a full-screen modal, one at a time. */
export function ApprovalHost() {
  const {platform} = useWallet();
  const [current, setCurrent] = useState<PendingApproval | null>(null);

  useEffect(
    () => platform.approvals.subscribe(next => setCurrent(next)),
    [platform],
  );

  useEffect(() => {
    // Multisig requests are not handled on mobile yet.
    if (current && !SUPPORTED.has(current.path)) {
      platform.approvals.resolve(
        current.id,
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNSUPPORTED_TYPE,
          {},
          current.message.key,
        ),
      );
    }
  }, [current, platform]);

  if (!current || !SUPPORTED.has(current.path)) {
    return null;
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => platform.approvals.reject(current.id)}>
      <ApprovalSession key={current.id} request={current} platform={platform} />
      <ReauthHost />
    </Modal>
  );
}

/**
 * One request's screen. It unmounts once the request is answered, including
 * when the queue answers it (a newer request or a lock dismissed it); the
 * abort then cancels a pending re-authentication so nothing is signed or
 * broadcast for a request the page already got an answer to.
 */
function ApprovalSession({
  request,
  platform,
}: {
  request: PendingApproval;
  platform: MobilePlatform;
}) {
  const [controller] = useState(() => new AbortController());
  useEffect(() => () => controller.abort(), [controller]);
  // Mounted on a request that is already being broadcast: the wallet was
  // locked and unlocked meanwhile. The broadcast answers it; showing the
  // screen again would offer to send the same transaction twice.
  const [resumedInFlight] = useState(request.inFlight);

  if (resumedInFlight) {
    return <BroadcastPending />;
  }

  return (
    <ApprovalErrorBoundary
      onError={() => {
        // A broadcast already under way answers the request itself.
        if (platform.approvals.current()?.inFlight) {
          return;
        }
        platform.approvals.resolve(
          request.id,
          makeDismissedResponse(request.message),
        );
      }}>
      <ApprovalScreen
        request={request}
        signal={controller.signal}
        respond={response =>
          platform.approvals.resolve(request.id, response as any)
        }
        dismiss={() => platform.approvals.reject(request.id)}
        markInFlight={() => platform.approvals.markInFlight(request.id)}
      />
    </ApprovalErrorBoundary>
  );
}

function BroadcastPending() {
  return (
    <Screen>
      <ApprovalTitle>Sending Transaction</ApprovalTitle>
      <View style={styles.pending}>
        <ActivityIndicator color={colors.text} />
      </View>
      <Body muted center>
        The transaction you approved is being sent. This closes when the network
        answers.
      </Body>
    </Screen>
  );
}

/**
 * A request whose content breaks rendering fails that request instead of
 * taking the app down; the page decides what it sends.
 */
class ApprovalErrorBoundary extends React.Component<
  React.PropsWithChildren<{onError: () => void}>,
  {failed: boolean}
> {
  state = {failed: false};

  static getDerivedStateFromError() {
    return {failed: true};
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const styles = StyleSheet.create({
  pending: {paddingVertical: 24},
});
