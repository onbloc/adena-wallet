import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseType,
} from '@adena-wallet/sdk';
import type {StdSignDoc} from '@cosmjs/amino';
import {fromBech32} from '@cosmjs/encoding';
import {
  deserializeSignDoc,
  serializeSignDoc,
} from '@common/utils/cosmos-serialize';
import {bytesToBase64} from '@common/utils/encoding-util';
import {getSiteName} from '@common/utils/url-parameter-utils';
import {
  InjectionMessage,
  InjectionMessageInstance,
} from '@inject/message/message';
import {createSessionAccountUnsupportedResponse} from '@inject/message/session-account-response';
import {
  CosmosResponseExecuteType,
  EnableCosmosParams,
  GetCosmosKeyParams,
  SerializedSignDoc,
  SignCosmosAminoParams,
  SignCosmosDirectParams,
} from '@inject/types';
import FaviconDefault from '@assets/favicon-default.svg';
import {compressPubkeyIfNeeded, isSessionAccount} from 'adena-module';
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {useWallet} from '../core/wallet-context';
import {useReauth} from '../security/reauth';
import {Address} from '../ui/address';
import {Body, ButtonPair, ErrorBanner, Notice, Screen} from '../ui/components';
import {colors} from '../ui/theme';
import {
  ApprovalTitle,
  DomainBox,
  InfoPill,
  KeyValue,
  MessageCard,
  PermissionTable,
  RawData,
} from './approval-ui';
import type {ApprovalProps} from './types';

/**
 * Cosmos (AtomOne) approvals: ENABLE_COSMOS, GET_COSMOS_KEY while locked,
 * and SIGN_COSMOS_AMINO / SIGN_COSMOS_DIRECT. The request checks (chain in the
 * AtomOne group, site connected, not a session account) already ran in the
 * shared handler (inject/message/methods/cosmos.ts) before these open.
 */

// The SDK's response table has no Cosmos entries yet, so the response is
// built by hand, exactly as the extension's handler and popups do.
export function cosmosResponse(
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

export function normalizeChainIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );
  }
  return [];
}

/** chain_id inside the document; the request's chainId must match it. */
export function signDocChainId(
  mode: 'amino' | 'direct',
  signDoc: unknown,
): string | undefined {
  const doc = signDoc as {chain_id?: unknown; chainId?: unknown} | null;
  const value = mode === 'amino' ? doc?.chain_id : doc?.chainId;
  return typeof value === 'string' ? value : undefined;
}

/** ENABLE_COSMOS: records one AtomOne connection per requested chain. */
export function CosmosConnectApproval({request, respond}: ApprovalProps) {
  const {base, account} = useWallet();
  const [busy, setBusy] = useState(false);
  const message = request.message as InjectionMessage;
  const origin = getSiteName(message.protocol, message.hostname);
  const chainIds = normalizeChainIds(
    (message.data as EnableCosmosParams | undefined)?.chainIds,
  );

  useEffect(() => {
    if (account && isSessionAccount(account)) {
      respond(createSessionAccountUnsupportedResponse(message.key));
    }
  }, [account, message.key, respond]);

  const reply = (
    status: 'success' | 'failure',
    data?: Record<string, unknown>,
    reason = '',
  ) =>
    respond(
      cosmosResponse(
        CosmosResponseExecuteType.ENABLE_COSMOS,
        status,
        message.key,
        data,
        reason,
      ),
    );

  const approve = async () => {
    if (!account) {
      return;
    }
    setBusy(true);
    try {
      for (const chainId of chainIds) {
        await base.establishAtomOneService.establishBy(account.id, chainId, {
          hostname: origin,
          accountId: account.id,
          appName: origin,
          favicon: null,
        });
      }
      reply('success');
    } catch (e) {
      reply(
        'failure',
        {error: (e as Error).message},
        WalletResponseFailureType.UNEXPECTED_ERROR,
      );
    }
  };

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{
            title: 'Cancel',
            onPress: () =>
              reply(
                'failure',
                undefined,
                WalletResponseRejectType.CONNECTION_REJECTED,
              ),
          }}
          confirm={{
            title: 'Connect',
            testID: 'approve-cosmos-connect',
            onPress: approve,
            loading: busy,
            disabled: chainIds.length === 0,
          }}
        />
      }>
      <ApprovalTitle>{`Connect to ${origin}`}</ApprovalTitle>
      <View style={styles.logo}>
        <FaviconDefault width={80} height={80} />
      </View>
      <DomainBox origin={origin} />
      <PermissionTable
        items={[
          'See your AtomOne address and public key',
          'Suggest transactions to sign',
        ]}
      />
      <MessageCard title="AtomOne networks">
        {chainIds.map(chainId => (
          <KeyValue key={chainId} label="Chain ID" value={chainId} />
        ))}
      </MessageCard>
      <Body muted>
        Only connect to websites you trust and opened yourself. Check the site
        address above, letter by letter.
      </Body>
    </Screen>
  );
}

/**
 * GET_COSMOS_KEY reaches the UI only when the request arrived while Adena was
 * locked. Approvals show after unlock, so the key is sent right away: the
 * site is already connected, as the shared handler checked.
 */
export function CosmosKeyApproval({request, respond}: ApprovalProps) {
  const {base, account} = useWallet();
  const sent = useRef(false);
  const message = request.message as InjectionMessage;

  useEffect(() => {
    if (!account || sent.current) {
      return;
    }
    sent.current = true;
    const fail = (reason: string, detail?: string) =>
      respond(
        cosmosResponse(
          CosmosResponseExecuteType.GET_COSMOS_KEY,
          'failure',
          message.key,
          detail ? {error: detail} : undefined,
          reason,
        ),
      );
    (async () => {
      try {
        if (isSessionAccount(account)) {
          respond(createSessionAccountUnsupportedResponse(message.key));
          return;
        }
        const {chainId} = (message.data ?? {}) as GetCosmosKeyParams;
        const chain = chainId
          ? base.chainRegistry.getChainByChainId(chainId)
          : undefined;
        if (!chain) {
          fail(WalletResponseFailureType.INVALID_FORMAT);
          return;
        }
        const bech32Address = await account.getAddress(chain.bech32Prefix);
        const {data: addressBytes} = fromBech32(bech32Address);
        respond(
          cosmosResponse(
            CosmosResponseExecuteType.GET_COSMOS_KEY,
            'success',
            message.key,
            {
              algo: 'secp256k1',
              pubKey: bytesToBase64(
                Array.from(compressPubkeyIfNeeded(account.publicKey)),
              ),
              address: bytesToBase64(Array.from(addressBytes)),
              bech32Address,
              isNanoLedger: account.type === 'LEDGER',
            },
          ),
        );
      } catch (e) {
        fail(WalletResponseFailureType.UNEXPECTED_ERROR, (e as Error).message);
      }
    })();
  }, [account, base, message, respond]);

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    </Screen>
  );
}

type SignState =
  | {phase: 'checking'}
  | {phase: 'ready'; address: string}
  | {phase: 'blocked'; reason: string}
  | {phase: 'working'};

/** SIGN_COSMOS_AMINO and SIGN_COSMOS_DIRECT. */
export function CosmosSignApproval({
  request,
  respond,
  mode,
}: ApprovalProps & {mode: 'amino' | 'direct'}) {
  const {base, net, account} = useWallet();
  const requestReauth = useReauth();
  const [state, setState] = useState<SignState>({phase: 'checking'});
  const message = request.message as InjectionMessage;
  const params = (message.data ?? {}) as
    | SignCosmosAminoParams
    | SignCosmosDirectParams;
  const origin = getSiteName(message.protocol, message.hostname);
  const responseType =
    mode === 'direct'
      ? CosmosResponseExecuteType.SIGN_COSMOS_DIRECT
      : CosmosResponseExecuteType.SIGN_COSMOS_AMINO;

  // Mobile-only checks: the signer must be this account on this chain, and
  // the document must be for the chain the request names.
  useEffect(() => {
    if (!account) {
      return;
    }
    if (isSessionAccount(account)) {
      respond(createSessionAccountUnsupportedResponse(message.key));
      return;
    }
    (async () => {
      const chain = base.chainRegistry.getChainByChainId(params.chainId);
      if (!chain) {
        setState({phase: 'blocked', reason: 'Unknown AtomOne network.'});
        return;
      }
      const address = await account.getAddress(chain.bech32Prefix);
      if (params.signer !== address) {
        setState({
          phase: 'blocked',
          reason: `The site asked to sign as ${params.signer}, which is not the current account.`,
        });
        return;
      }
      const docChain = signDocChainId(mode, params.signDoc);
      if (docChain !== params.chainId) {
        setState({
          phase: 'blocked',
          reason: `The document is for ${docChain ?? 'an unknown chain'}, not ${
            params.chainId
          }.`,
        });
        return;
      }
      setState({phase: 'ready', address});
    })();
    // The request is fixed for the lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, base]);

  const fail = (reason: string, detail?: string) =>
    respond(
      cosmosResponse(
        responseType,
        'failure',
        message.key,
        detail ? {error: detail} : undefined,
        reason,
      ),
    );

  const reject = () =>
    respond(
      InjectionMessageInstance.failure(
        WalletResponseRejectType.SIGN_REJECTED,
        {},
        message.key,
      ),
    );

  const approve = async () => {
    if (state.phase !== 'ready' || !account || !net) {
      return;
    }
    if (!(await requestReauth(`Sign for ${origin}`))) {
      return;
    }
    setState({phase: 'working'});
    try {
      if (mode === 'amino') {
        const signed = await net.transactionService.signCosmosAminoDoc(
          account.id,
          params.signDoc as StdSignDoc,
        );
        respond(
          cosmosResponse(responseType, 'success', message.key, {
            signed: signed.signed,
            signature: signed.signature,
          }),
        );
        return;
      }
      const signed = await net.transactionService.signCosmosDirectDoc(
        account.id,
        deserializeSignDoc(params.signDoc as SerializedSignDoc),
      );
      respond(
        cosmosResponse(responseType, 'success', message.key, {
          signed: serializeSignDoc(signed.signed),
          signature: signed.signature,
        }),
      );
    } catch (e) {
      const detail = (e as Error).message;
      fail(
        detail === 'LEDGER_NOT_SUPPORTED'
          ? WalletResponseFailureType.UNSUPPORTED_TYPE
          : WalletResponseFailureType.UNEXPECTED_ERROR,
        detail,
      );
    }
  };

  const amino = mode === 'amino' ? (params.signDoc as StdSignDoc) : null;

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: reject}}
          confirm={{
            title: 'Sign',
            testID: 'approve-cosmos-sign',
            onPress: approve,
            disabled: state.phase !== 'ready',
            loading: state.phase === 'working',
          }}
        />
      }>
      <ApprovalTitle>Sign Cosmos Transaction</ApprovalTitle>
      <DomainBox origin={origin} />
      {state.phase === 'blocked' && <ErrorBanner>{state.reason}</ErrorBanner>}
      <InfoPill label="Chain ID" value={params.chainId} />
      <InfoPill
        label="Sign mode"
        value={mode === 'direct' ? 'DIRECT' : 'LEGACY_AMINO_JSON'}
      />
      <MessageCard title="Signer">
        <KeyValue
          label="Address"
          stacked
          value={<Address value={String(params.signer ?? '')} />}
        />
      </MessageCard>
      {amino ? (
        <MessageCard title={`${amino.msgs.length} message(s)`}>
          {amino.msgs.map((msg, index) => (
            <KeyValue key={index} label={`${index + 1}.`} value={msg.type} />
          ))}
          <KeyValue
            label="Fee"
            value={
              amino.fee.amount
                .map(coin => `${coin.amount} ${coin.denom}`)
                .join(', ') || 'None'
            }
          />
          <KeyValue label="Memo" value={amino.memo || '(Empty)'} />
        </MessageCard>
      ) : (
        <Notice tone="danger">
          Adena cannot show the messages of a DIRECT sign request in readable
          form. Only sign it if you trust this site and expected this request.
        </Notice>
      )}
      <Notice>
        The site receives the signature and can broadcast the transaction.
      </Notice>
      <RawData json={params.signDoc} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {alignSelf: 'center'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
