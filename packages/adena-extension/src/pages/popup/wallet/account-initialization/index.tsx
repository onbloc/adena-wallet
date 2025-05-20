import { CommonFullContentLayout } from '@components/atoms';
import AccountInitializationPage from '@components/pages/account-initialization/account-initialization';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

export default function AccountInitialization(): JSX.Element {
  const { wallet } = useWalletContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { transactionService } = useAdenaContext();

  const moveBack = (): void => {
    history.back();
  };

  const initializeAccount = async (): Promise<boolean> => {
    if (!wallet || !currentAccount) {
      return false;
    }

    return transactionService.broadcastEmptyTransaction(wallet, currentAccount);
  };

  return (
    <CommonFullContentLayout>
      <AccountInitializationPage
        address={currentAddress}
        moveBack={moveBack}
        initializeAccount={initializeAccount}
      />
    </CommonFullContentLayout>
  );
}
