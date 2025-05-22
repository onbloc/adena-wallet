import { CommonFullContentLayout } from '@components/atoms';
import AccountInitializationPage from '@components/pages/account-initialization/account-initialization';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

/**
 * The page to initialize your account is deprecated for now.
 * Keep it for account initialization.
 */
export default function AccountInitialization(): JSX.Element {
  const { wallet } = useWalletContext();
  const { currentAccount, currentAddress } = useCurrentAccount();

  const moveBack = (): void => {
    history.back();
  };

  const initializeAccount = async (): Promise<boolean> => {
    if (!wallet || !currentAccount) {
      return false;
    }

    // Change it to run an empty transaction that can be initialized.
    return true;
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
