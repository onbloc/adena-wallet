import { useCallback, useState } from 'react';
import { defaultAddressPrefix } from '@gnolang/tm2-js-client';
import { AirgapAccount, AddressKeyring, AdenaWallet, fromBech32 } from 'adena-module';

import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { RoutePath } from '@types';

export type UseSetupAirgapScreenReturn = {
  address: string;
  errorMessage: string | null;
  changeAddress: (address: string) => void;
  setupAirgapState: SetupAirgapStateType;
  setSetupAirgapState: (setupAirgapState: SetupAirgapStateType) => void;
  initSetup: () => void;
  confirmAddress: () => void;
  addAccount: (password?: string) => Promise<void>;
};

export type SetupAirgapStateType = 'INIT' | 'ENTER_ADDRESS' | 'COMPLETE';

export const setupAirgapStep: Record<
  SetupAirgapStateType,
  {
    backTo: SetupAirgapStateType | null;
    stepNo: number;
  }
> = {
  INIT: {
    backTo: null,
    stepNo: 0,
  },
  ENTER_ADDRESS: {
    backTo: 'INIT',
    stepNo: 1,
  },
  COMPLETE: {
    backTo: 'ENTER_ADDRESS',
    stepNo: 2,
  },
};

const useSetupAirgapScreen = (): UseSetupAirgapScreenReturn => {
  const { navigate } = useAppNavigate();
  const { updateWallet } = useWalletContext();
  const { walletService } = useAdenaContext();
  const [setupAirgapState, setSetupAirgapState] = useState<SetupAirgapStateType>('INIT');
  const [address, setAddress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockedEvent, setBlockedEvent] = useState<boolean>(false);
  const { changeCurrentAccount } = useCurrentAccount();

  const initSetup = useCallback(() => {
    setSetupAirgapState('ENTER_ADDRESS');
  }, [setupAirgapState]);

  const changeAddress = useCallback((address: string) => {
    setAddress(address);
    setErrorMessage(null);
  }, []);

  const _validateAddress = useCallback(() => {
    try {
      const { prefix } = fromBech32(address);
      if (address && prefix === defaultAddressPrefix) {
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }, [address]);

  const confirmAddress = useCallback(() => {
    if (!_validateAddress()) {
      const errorMessage = 'Invalid address';
      setErrorMessage(errorMessage);
      return;
    }
    setSetupAirgapState('COMPLETE');
  }, [_validateAddress]);

  const _addAddressAccount = useCallback(async () => {
    const wallet = await walletService.loadWallet();
    const addressKeyring = await AddressKeyring.fromAddress(address);
    const account = await AirgapAccount.createBy(addressKeyring, 'Account');

    const addedIndex = wallet.lastAccountIndex + 1;
    account.index = addedIndex;
    account.name = `Account ${addedIndex}`;

    const clone = wallet.clone();
    clone.addAccount(account);

    await changeCurrentAccount(account);
    await updateWallet(clone);
    navigate(RoutePath.WebAccountAddedComplete);
  }, [address, walletService]);

  const _createAddressAccount = useCallback(async () => {
    const createdWallet = await AdenaWallet.createByAddress(address);
    const serializedWallet = await createdWallet.serialize('');
    navigate(RoutePath.WebCreatePassword, {
      state: {
        serializedWallet,
      },
    });
  }, [address, walletService]);

  const addAccount = useCallback(async () => {
    if (blockedEvent) {
      return;
    }
    setBlockedEvent(true);
    try {
      const existWallet = await walletService.existsWallet();
      if (existWallet) {
        await _addAddressAccount();
      } else {
        await _createAddressAccount();
      }
    } catch (e) {
      console.log(e);
    }
    setBlockedEvent(false);
  }, [blockedEvent, walletService, _addAddressAccount, _createAddressAccount]);

  return {
    address,
    errorMessage,
    setupAirgapState,
    setSetupAirgapState,
    initSetup,
    changeAddress,
    confirmAddress,
    addAccount,
  };
};

export default useSetupAirgapScreen;
