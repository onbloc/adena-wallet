import GnotLogo from '@assets/gnot-logo-white.svg';
import SubmitIcon from '@assets/submit.svg';
import {GNOT_TOKEN} from '@common/constants/token.constant';
import {
  classifyGnoSigningRisk,
  SigningRiskAssessment,
} from '@common/validation/validation-signing-risk';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {createMessageOfVmCall} from '@services/transaction/message/vm/vm';
import type {Document} from 'adena-module';
import BigNumber from 'bignumber.js';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {estimateFee, FeeEstimate, withFee} from '../core/fees';
import {formatGnot} from '../core/format';
import {useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {useReauth} from '../security/reauth';
import {Address} from '../ui/address';
import {NftImage} from '../ui/nft';
import {
  Body,
  Button,
  ButtonPair,
  ErrorBanner,
  Mono,
  Notice,
  Screen,
  SummaryCard,
  SummaryRow,
  Title,
} from '../ui/components';
import {RiskNotices} from '../ui/risk-notices';
import {colors, colorTokens, fonts} from '../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'SendConfirm'>;

type State =
  | {phase: 'preparing'}
  | {
      phase: 'ready';
      document: Document;
      fee: FeeEstimate;
      risk: SigningRiskAssessment;
    }
  | {phase: 'failed'; message: string}
  | {phase: 'sending'}
  | {phase: 'sent'; hash: string};

/** The message the confirm screen simulates and signs for each kind. */
export function transferMessage(params: Props['route']['params'], from: string) {
  if (params.kind === 'nft') {
    // The extension's GRC721 transfer: TransferFrom on the collection realm.
    return createMessageOfVmCall({
      caller: from,
      send: '',
      max_deposit: '',
      pkgPath: params.token.packagePath,
      func: 'TransferFrom',
      args: [from, params.to, params.token.tokenId],
    });
  }
  return {
    type: '/bank.MsgSend',
    value: {
      from_address: from,
      to_address: params.to,
      amount: `${params.ugnot}${GNOT_TOKEN.denom}`,
    },
  };
}

/**
 * The extension's transfer summary, broadcasting and result screens, for GNOT
 * and for an NFT (GRC721).
 */
export function SendConfirmScreen({route, navigation}: Props) {
  const params = route.params;
  const {to, memo} = params;
  const {net, wallet, account, address} = useWallet();
  const requestReauth = useReauth();
  const [state, setState] = useState<State>({phase: 'preparing'});

  useEffect(() => {
    if (!net || !account || !address) {
      return;
    }
    (async () => {
      try {
        const message = transferMessage(params, address);
        const draft = await net.transactionService.createDocument(
          account,
          net.network.networkId,
          [message],
          net.network.addressPrefix,
          undefined,
          undefined,
          memo,
        );
        const fee = await estimateFee(net.gnoProvider, account, draft);
        const document = withFee(draft, fee.gasWanted, fee.gasFee);
        const risk = classifyGnoSigningRisk(document.msgs as any[], {
          knownRecipients: new Set([address]),
        });
        setState({phase: 'ready', document, fee, risk});
      } catch (e) {
        setState({
          phase: 'failed',
          message: `The network rejected this transfer in simulation: ${
            (e as Error).message
          }`,
        });
      }
    })();
    // `params` is fixed for the life of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net, account, address, to, memo]);

  const confirm = async () => {
    if (state.phase !== 'ready' || !net || !wallet || !account) {
      return;
    }
    const {document} = state;
    const what = params.kind === 'nft' ? 'NFT' : 'GNOT';
    if (!(await requestReauth(`Approve sending ${what}`))) {
      return;
    }
    setState({phase: 'sending'});
    try {
      const {signed} = await net.transactionService.createTransaction(
        wallet,
        account,
        document,
      );
      const result = await net.transactionService.sendTransaction(
        wallet,
        account,
        signed,
        false,
      );
      setState({phase: 'sent', hash: result.hash});
    } catch (e) {
      setState({
        phase: 'failed',
        message: `Sending failed: ${(e as Error).message}`,
      });
    }
  };

  if (state.phase === 'sending') {
    return (
      <Screen scroll={false}>
        <View style={styles.status}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Title center>Broadcasting...</Title>
          <Body muted center>
            Your transaction is being broadcasted.
          </Body>
        </View>
      </Screen>
    );
  }

  if (state.phase === 'sent') {
    return (
      <Screen
        footer={
          <Button
            title="Close"
            variant="dark"
            onPress={() => navigation.popToTop()}
          />
        }>
        <View style={styles.status}>
          <SubmitIcon width={100} height={100} />
          <Title center>Transaction Submitted</Title>
          <Body muted center>
            Your transaction has been successfully submitted to the blockchain.
          </Body>
          <Mono>{state.hash}</Mono>
        </View>
      </Screen>
    );
  }

  // What is shown comes from the document that will be signed, not from the form.
  const sendMessage =
    state.phase === 'ready' ? (state.document.msgs[0] as any) : null;
  const total =
    state.phase === 'ready'
      ? BigNumber(params.kind === 'gnot' ? params.ugnot : 0)
          .plus(state.fee.gasFee)
          .toFixed(0)
      : null;
  const recipient =
    sendMessage?.value.to_address ?? sendMessage?.value.args?.[1] ?? '';

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: () => navigation.goBack()}}
          confirm={{
            title: 'Send',
            testID: 'send-confirm',
            onPress: confirm,
            disabled: state.phase !== 'ready',
          }}
        />
      }>
      {state.phase === 'preparing' && (
        <Body muted>Simulating the transaction…</Body>
      )}
      {state.phase === 'failed' && <ErrorBanner>{state.message}</ErrorBanner>}
      {sendMessage && state.phase === 'ready' && (
        <>
          {params.kind === 'nft' ? (
            <View style={styles.nftCard}>
              <View style={styles.nftImage}>
                <NftImage token={params.token} />
              </View>
              <Text style={styles.tokenName} numberOfLines={1}>
                {params.token.name} #{params.token.tokenId}
              </Text>
            </View>
          ) : (
            <View style={styles.amountCard}>
              <View style={styles.tokenLogo}>
                <GnotLogo width={22} height={22} />
              </View>
              <Text style={styles.tokenName}>Gnoland</Text>
              <Text style={styles.amount}>
                {formatGnot(
                  sendMessage.value.amount.replace(GNOT_TOKEN.denom, ''),
                )}
              </Text>
            </View>
          )}
          <SummaryCard>
            <SummaryRow
              label="To"
              value={<Address value={recipient} />}
              stacked
            />
            <SummaryRow
              label="Network"
              value={net?.network.networkName ?? ''}
            />
            <SummaryRow
              label="Memo"
              value={state.document.memo || '(Empty)'}
              muted={!state.document.memo}
            />
          </SummaryCard>
          <SummaryCard>
            <SummaryRow
              label="Network Fee"
              value={formatGnot(state.fee.gasFee)}
            />
            <SummaryRow label="Total" value={formatGnot(total)} />
          </SummaryCard>
          <RiskNotices risk={state.risk} />
          <Notice>
            Check the full address against the one the recipient gave you, not
            just the first and last characters.
          </Notice>
        </>
      )}
    </Screen>
  );
}

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  status: {alignItems: 'center', gap: 12, paddingTop: 56},
  amountCard: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: neutral._9,
  },
  tokenLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: neutral._7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenName: {...fonts.body2Bold, color: colors.text, flex: 1},
  amount: {...fonts.body2Reg, color: colors.text},
  nftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: neutral._9,
  },
  nftImage: {width: 60, height: 60, borderRadius: 8, overflow: 'hidden'},
});
