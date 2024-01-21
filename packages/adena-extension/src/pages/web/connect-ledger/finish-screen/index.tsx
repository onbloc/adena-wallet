import styled, { useTheme } from 'styled-components';
import {
  LedgerAccount,
  AdenaLedgerConnector,
  LedgerKeyring,
  deserializeAccount,
} from 'adena-module';

import { WebMain, View, WebText, WebButton } from '@components/atoms';
import IconSuccessSymbol from '@assets/success-symbol.svg';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import WebImg from '@components/atoms/web-img';

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
        <WebImg src={IconSuccessSymbol} size={64} />
        <StyledMessageBox>
          <WebText type='headline3' textCenter>
            Account Added
          </WebText>
          <WebText type='body4' color={theme.webNeutral._500} textCenter>
            {
              'You have successfully added your ledger device account to Adena!\nPlease return to your extension to continue'
            }
          </WebText>
        </StyledMessageBox>
        <WebButton figure='primary' size='small' onClick={onClickDoneButton}>
          <WebText type='title4'>Done</WebText>
        </WebButton>
      </StyledContainer>
    </WebMain>
  );
};

export default ConnectLedgerFinish;
