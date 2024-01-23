import styled, { useTheme } from 'styled-components';
import {
  LedgerAccount,
  AdenaLedgerConnector,
  LedgerKeyring,
  deserializeAccount,
} from 'adena-module';

import addGif from '@assets/web/account-added.gif';

import { WebMain, View, WebText, WebButton, WebImg } from '@components/atoms';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 552px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const ConnectLedgerFinish = (): JSX.Element => {
  const theme = useTheme();

  const { wallet, updateWallet } = useWalletContext();
  const { accountService } = useAdenaContext();
  const { params } = useAppNavigate<RoutePath.WebConnectLedgerFinish>();

  const onClickDoneButton = async (): Promise<void> => {
    const { accounts } = params;
    if (!wallet) {
      return;
    }
    const transport = await AdenaLedgerConnector.openConnected();
    if (!transport) {
      return;
    }
    const deserializeAccounts = accounts.map(deserializeAccount) as LedgerAccount[];
    const keyring = await LedgerKeyring.fromLedger(AdenaLedgerConnector.fromTransport(transport));
    const accountInfos = deserializeAccounts.map((account) => account.toData());
    const clone = wallet.clone();
    let currentAccount = null;
    for (const accountInfo of accountInfos) {
      const account = LedgerAccount.fromData({
        ...accountInfo,
        name: `Ledger ${accountInfo.hdPath + 1}`,
        keyringId: keyring.id,
      });
      clone.addKeyring(keyring);
      clone.addAccount(account);
      currentAccount = account;
    }
    if (currentAccount) {
      await accountService.changeCurrentAccount(currentAccount);
    }
    await updateWallet(clone);
    await transport.close();
    window.close();
  };

  return (
    <WebMain>
      <StyledContainer>
        <WebImg src={addGif} size={200} />
        <StyledMessageBox>
          <WebText type='headline3' textCenter>
            Account Added!
          </WebText>
          <WebText type='body4' color={theme.webNeutral._500} textCenter>
            {
              'You have successfully added your a new account to\nAdena! Please return to your extension to continue.'
            }
          </WebText>
        </StyledMessageBox>
        <WebButton
          figure='primary'
          size='small'
          onClick={onClickDoneButton}
          text='Return to Extension'
          rightIcon='chevronRight'
        />
      </StyledContainer>
    </WebMain>
  );
};

export default ConnectLedgerFinish;
