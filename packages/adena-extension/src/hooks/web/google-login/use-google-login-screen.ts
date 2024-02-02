import { useCallback, useMemo, useState } from 'react';
import { AdenaWallet, SingleAccount, Web3AuthKeyring } from 'adena-module';
import { GoogleTorusSigner } from 'adena-torus-signin/src';

import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { RoutePath } from '@types';
import useQuestionnaire from '../use-questionnaire';

export type UseGoogleLoginReturn = {
  googleLoginState: GoogleLoginStateType;
  googleLoginStepNo: Record<GoogleLoginStateType, number>;
  stepLength: number;
  backStep: () => void;
  retry: () => void;
  initGoogleLogin: () => void;
  requestGoogleLogin: () => Promise<void>;
};

export type GoogleLoginStateType = 'INIT' | 'REQUEST_LOGIN' | 'FAILED';

const useGoogleLoginScreen = (): UseGoogleLoginReturn => {
  const { walletService } = useAdenaContext();
  const { navigate, params } = useAppNavigate<RoutePath.WebGoogleLogin>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const { updateWallet } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();

  const [googleLoginState, setGoogleLoginState] = useState<GoogleLoginStateType>(
    params?.doneQuestionnaire ? 'REQUEST_LOGIN' : 'INIT',
  );

  const stepInfo = useMemo(() => {
    const googleLoginStepNo: Record<GoogleLoginStateType, number> = ableToSkipQuestionnaire
      ? {
          INIT: 0,
          REQUEST_LOGIN: 1,
          FAILED: 2,
        }
      : {
          INIT: 0,
          REQUEST_LOGIN: 2,
          FAILED: 3,
        };
    const stepLength = ableToSkipQuestionnaire
      ? Object.keys(googleLoginStepNo).length
      : Object.keys(googleLoginStepNo).length + 1;
    return {
      stepLength,
      googleLoginStepNo,
    };
  }, [ableToSkipQuestionnaire]);

  const initGoogleLogin = useCallback(() => {
    if (ableToSkipQuestionnaire) {
      setGoogleLoginState('REQUEST_LOGIN');
      return;
    }
    navigate(RoutePath.WebQuestionnaire, {
      state: {
        callbackPath: RoutePath.WebGoogleLogin,
      },
    });
  }, [ableToSkipQuestionnaire]);

  const requestGoogleLogin = async (): Promise<void> => {
    try {
      // Initialize Google Login
      const web3Auth = GoogleTorusSigner.create();
      const initialized = await web3Auth.init();
      if (!web3Auth || !initialized) {
        throw new Error('Failed to initialize web3auth.');
      }

      // // Connect Google
      const connected = await web3Auth.connect();
      if (!connected) {
        throw new Error('Failed to connect web3auth.');
      }
      const privateKey = await web3Auth.getPrivateKey();
      await web3Auth.disconnect();

      // Create Adena Wallet Instance
      const existWallet = await walletService.existsWallet();
      if (existWallet) {
        await _addGoogleAccount(privateKey);
      } else {
        await _createGoogleAccount(privateKey);
      }
    } catch (e) {
      console.error(e);
    }
    setGoogleLoginState('FAILED');
  };

  const _addGoogleAccount = useCallback(
    async (privateKey: string) => {
      const wallet = await walletService.loadWallet();

      const clone = wallet.clone();
      const web3AuthKeyring = await Web3AuthKeyring.fromPrivateKeyStr(privateKey);
      const account = await SingleAccount.createBy(web3AuthKeyring, clone.nextAccountName);
      account.index = clone.lastAccountIndex + 1;
      clone.addAccount(account);
      clone.addKeyring(web3AuthKeyring);
      const storedAccount = clone.accounts.find((storedAccount) => storedAccount.id === account.id);
      if (storedAccount) {
        await changeCurrentAccount(storedAccount);
      }
      await updateWallet(clone);
      navigate(RoutePath.WebAccountAddedComplete);
    },
    [navigate],
  );

  const _createGoogleAccount = useCallback(
    async (privateKey: string) => {
      const createdWallet = await AdenaWallet.createByWeb3Auth(privateKey);
      const serializedWallet = await createdWallet.serialize('');
      navigate(RoutePath.WebCreatePassword, {
        state: {
          serializedWallet,
          stepLength: stepInfo.stepLength,
        },
      });
    },
    [navigate],
  );

  const backStep = useCallback(() => {
    if (googleLoginState === 'INIT') {
      navigate(RoutePath.WebAdvancedOption);
      return;
    }
    setGoogleLoginState('INIT');
  }, [googleLoginState]);

  const retry = useCallback(() => {
    setGoogleLoginState('REQUEST_LOGIN');
  }, []);

  return {
    googleLoginState,
    googleLoginStepNo: stepInfo.googleLoginStepNo,
    stepLength: stepInfo.stepLength,
    backStep,
    retry,
    initGoogleLogin,
    requestGoogleLogin,
  };
};

export default useGoogleLoginScreen;
