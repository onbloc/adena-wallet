import {WalletResponseFailureType} from '@adena-wallet/sdk';
import {InjectionMessageInstance} from '@inject/message/message';
import {RoutePath} from '@types';
import React, {useEffect, useState} from 'react';
import {Modal} from 'react-native';

import {useWallet} from '../core/wallet-context';
import type {PendingApproval} from '../platform/approval-queue';
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
      <ApprovalScreen
        key={current.id}
        request={current}
        respond={response =>
          platform.approvals.resolve(current.id, response as any)
        }
        dismiss={() => platform.approvals.reject(current.id)}
      />
    </Modal>
  );
}
