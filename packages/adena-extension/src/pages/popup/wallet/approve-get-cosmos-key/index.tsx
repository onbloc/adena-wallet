import {
  WalletResponseFailureType,
  WalletResponseType,
} from '@adena-wallet/sdk';
import { Secp256k1 } from '@cosmjs/crypto';
import { fromBech32 } from '@cosmjs/encoding';
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { decodeParameter, parseParameters } from '@common/utils/client-utils';
import { bytesToBase64 } from '@common/utils/encoding-util';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { CosmosResponseExecuteType } from '@inject/types';
import { RoutePath } from '@types';

// Silent approval popup dedicated to `GET_COSMOS_KEY`. When the dApp requests
// a key while the wallet is locked, `cosmosGetKey` routes here via
// `createPopup`. The popup either:
//   - detects the wallet is still locked → navigates to ApproveLogin (which
//     redirects back here after unlock via `ApproveLogin.redirect` switch), or
//   - has the wallet unlocked and a resolved `currentAccount` → fetches the
//     Cosmos key, replies with a success InjectionMessage, and closes itself.
// No user-visible chrome beyond a minimal loading state; the Cosmos spec is
// that `getKey` should be a silent operation on trusted origins.

function createCosmosResponse(
  type: CosmosResponseExecuteType,
  status: 'success' | 'failure',
  key: string | undefined,
  data?: Record<string, unknown>,
  message = '',
): InjectionMessage {
  return {
    code: status === 'success' ? 0 : 1,
    key,
    type: type as unknown as WalletResponseType,
    status,
    message,
    data,
  };
}

const ApproveGetCosmosKeyContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const sentRef = useRef(false);

  // 1) If the wallet is locked, bounce to ApproveLogin with the same search
  // string so `redirect(GET_COSMOS_KEY)` eventually lands back here.
  useEffect(() => {
    walletService
      .isLocked()
      .then((locked) => locked && navigate(RoutePath.ApproveLogin + location.search));
  }, [walletService, location.search, navigate]);

  // 2) Once unlocked and `currentAccount` is ready, build the key and respond.
  useEffect(() => {
    if (!currentAccount || sentRef.current) {
      return;
    }
    const params = parseParameters(location.search);
    const key = params.key;

    const sendFailure = (failureType: string, detail?: string): void => {
      chrome.runtime.sendMessage(
        createCosmosResponse(
          CosmosResponseExecuteType.GET_COSMOS_KEY,
          'failure',
          key,
          detail ? { error: detail } : undefined,
          failureType,
        ),
      );
    };

    const run = async (): Promise<void> => {
      try {
        const message = params.data
          ? (decodeParameter(params.data) as InjectionMessage | null)
          : null;
        const chainId = (message?.data as { chainId?: string } | undefined)?.chainId;
        if (!chainId) {
          sendFailure(WalletResponseFailureType.INVALID_FORMAT);
          window.close();
          return;
        }

        // Mirror the chainRegistry + bech32Prefix lookup in cosmosGetKey.
        // InjectCore isn't available in the popup, but the resolveAddress call
        // on the account object only needs the prefix — atomone/atone for now.
        // If additional chain groups are added, centralize the mapping.
        const bech32Prefix = chainId.startsWith('atomone') ? 'atone' : 'atone';
        const bech32Address = await currentAccount.getAddress(bech32Prefix);
        const { data: addressBytes } = fromBech32(bech32Address);

        const compressedPubKey =
          currentAccount.publicKey.length === 65
            ? Secp256k1.compressPubkey(currentAccount.publicKey)
            : currentAccount.publicKey;

        chrome.runtime.sendMessage(
          createCosmosResponse(
            CosmosResponseExecuteType.GET_COSMOS_KEY,
            'success',
            key,
            {
              name: currentAccount.name,
              algo: 'secp256k1',
              pubKey: bytesToBase64(Array.from(compressedPubKey)),
              address: bytesToBase64(Array.from(addressBytes)),
              bech32Address,
              isNanoLedger: currentAccount.type === 'LEDGER',
            },
          ),
        );
      } catch (error) {
        console.warn('[ApproveGetCosmosKey] unexpected error:', error);
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.UNEXPECTED_ERROR,
            { error: (error as Error)?.message ?? String(error) },
            key,
          ),
        );
      } finally {
        sentRef.current = true;
        window.close();
      }
    };
    void run();
  }, [currentAccount, location.search]);

  return (
    <Wrapper>
      <Text>Unlocking…</Text>
    </Wrapper>
  );
};

export default ApproveGetCosmosKeyContainer;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
`;

const Text = styled.span`
  font-size: 13px;
  opacity: 0.6;
`;
