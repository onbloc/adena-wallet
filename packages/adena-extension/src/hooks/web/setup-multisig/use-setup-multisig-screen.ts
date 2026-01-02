import React from 'react';
import { defaultAddressPrefix } from '@gnolang/tm2-js-client';

import { MultisigConfig, fromBech32, validateAddress } from 'adena-module';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

export type UseSetupMultisigScreenReturn = {
  setupMultisigState: SetupMultisigStateType;
  setSetupMultisigState: (setupMultisigState: SetupMultisigStateType) => void;
  initSetup: (mode: MultisigAccountMode) => void;
  indicatorInfo: UseIndicatorStepReturn;
  multisigConfig: MultisigConfig;
  updateSigner: (index: number, address: string) => void;
  addSigner: () => void;
  removeSigner: (index: number) => void;
  validateMultisigConfig: () => boolean;
  multisigAccountMode: MultisigAccountMode;
  setMultisigAccountMode: (mode: MultisigAccountMode) => void;
  multisigConfigError: string | null;
  updateThreshold: (threshold: number) => void;
  createMultisigAccount: () => Promise<void>;
  createdMultisigAddress: string;
  resetMultisigConfig: () => void;
};

export type SetupMultisigStateType = 'INIT' | 'ENTER_MULTISIG_CONFIG' | 'LOADING' | 'COMPLETE';
export type MultisigAccountMode = 'CREATE' | 'IMPORT';

export const setupMultisigStepBackTo: Record<
  SetupMultisigStateType,
  SetupMultisigStateType | null
> = {
  INIT: null,
  ENTER_MULTISIG_CONFIG: 'INIT',
  COMPLETE: 'ENTER_MULTISIG_CONFIG',
  LOADING: 'ENTER_MULTISIG_CONFIG',
};

const setupMultisigStepNo = {
  INIT: 0,
  ENTER_MULTISIG_CONFIG: 1,
  COMPLETE: 2,
  LOADING: 2,
};

const DEFAULT_MULTISIG_CONFIG: MultisigConfig = {
  signers: ['', ''],
  threshold: 1,
  noSort: false,
};

export const MAX_SIGNERS = 7;

const useSetupMultisigScreen = (): UseSetupMultisigScreenReturn => {
  const { multisigService, walletService } = useAdenaContext();
  const { changeCurrentAccount, currentAddress } = useCurrentAccount();

  const [setupMultisigState, setSetupMultisigState] =
    React.useState<SetupMultisigStateType>('INIT');

  const [multisigConfig, setMultisigConfig] = React.useState<MultisigConfig>({
    ...DEFAULT_MULTISIG_CONFIG,
  });
  const [multisigConfigError, setMultisigConfigError] = React.useState<string | null>(null);

  const [multisigAccountMode, setMultisigAccountMode] =
    React.useState<MultisigAccountMode>('CREATE');

  const [blockedEvent, setBlockedEvent] = React.useState<boolean>(false);
  const [createdMultisigAddress, setCreatedMultisigAddress] = React.useState<string>('');

  const indicatorInfo = useIndicatorStep<SetupMultisigStateType>({
    stepMap: setupMultisigStepNo,
    currentState: setupMultisigState,
  });

  const initSetup = React.useCallback(
    (mode: MultisigAccountMode) => {
      setMultisigConfigError(null);
      setMultisigAccountMode(mode);

      if (mode === 'CREATE' && currentAddress) {
        setMultisigConfig({
          ...DEFAULT_MULTISIG_CONFIG,
          signers: [currentAddress, ''],
        });
      } else {
        setMultisigConfig({ ...DEFAULT_MULTISIG_CONFIG });
      }

      setSetupMultisigState('ENTER_MULTISIG_CONFIG');
    },
    [currentAddress],
  );

  const updateSigner = React.useCallback((index: number, address: string) => {
    setMultisigConfig((prev) => {
      const newSigners = [...prev.signers];
      newSigners[index] = address;
      return {
        ...prev,
        signers: newSigners,
      };
    });
    setMultisigConfigError(null);
  }, []);

  const addSigner = React.useCallback(() => {
    setMultisigConfig((prev) => {
      if (prev.signers.length >= MAX_SIGNERS) {
        return prev;
      }

      return {
        ...prev,
        signers: [...prev.signers, ''],
      };
    });
    setMultisigConfigError(null);
  }, []);

  const removeSigner = React.useCallback((index: number) => {
    setMultisigConfig((prev) => ({
      ...prev,
      signers: prev.signers.filter((_, i) => i !== index),
    }));
    setMultisigConfigError(null);
  }, []);

  const updateThreshold = React.useCallback((threshold: number) => {
    setMultisigConfig((prev) => ({
      ...prev,
      threshold,
    }));
    setMultisigConfigError(null);
  }, []);

  const validateMultisigConfig = React.useCallback(() => {
    const { signers, threshold } = multisigConfig;
    const validSigners = signers.filter((signer) => signer.trim() !== '');

    if (validSigners.length < 2) {
      setMultisigConfigError('At least 2 signers are required.');
      return false;
    }

    if (threshold < 1 || threshold > validSigners.length) {
      setMultisigConfigError(
        `Threshold must be between 1 and the number of signers (${validSigners.length}).`,
      );
      return false;
    }

    for (const signer of validSigners) {
      try {
        const { prefix } = fromBech32(signer);
        if (prefix !== defaultAddressPrefix) {
          setMultisigConfigError('Invalid address format.');
          return false;
        }
      } catch (e) {
        setMultisigConfigError('Invalid address format.');
        return false;
      }
    }

    const uniqueSigners = new Set(validSigners);
    if (uniqueSigners.size !== validSigners.length) {
      setMultisigConfigError('Duplicate addresses are not allowed.');
      return false;
    }

    setMultisigConfigError(null);
    return true;
  }, [multisigConfig]);

  const _createMultisigAccount = React.useCallback(async () => {
    try {
      const { signers } = multisigConfig;
      const validSigners = signers.filter((signer) => signer.trim() !== '');

      for (let i = 0; i < validSigners.length; i++) {
        const isValid = validateAddress(validSigners[i]);
        if (!isValid) {
          throw new Error(
            `Invalid address format for signer #${i + 1}. Please check and try again.`,
          );
        }
      }

      const { multisigAddress, multisigAddressBytes, multisigPubKey, signerPublicKeys } =
        await multisigService.createMultisigAccount(multisigConfig);

      const publicKeyBytesArray = Uint8Array.from(Object.values(multisigPubKey));
      const addressBytesArray = Uint8Array.from(Object.values(multisigAddressBytes));

      const multisigAccount = await walletService.addMultisigAccount(
        publicKeyBytesArray,
        addressBytesArray,
        multisigConfig,
        multisigAddress,
        signerPublicKeys,
      );

      await changeCurrentAccount(multisigAccount);
      return multisigAddress;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to create multisig account. Please try again.');
      }
    }
  }, [multisigService, walletService, multisigConfig, changeCurrentAccount]);

  const createMultisigAccount = React.useCallback(async () => {
    if (blockedEvent) {
      return;
    }

    try {
      setBlockedEvent(true);
      setSetupMultisigState('LOADING');

      const address = await _createMultisigAccount();
      setCreatedMultisigAddress(address);
      setSetupMultisigState('COMPLETE');
    } catch (e) {
      setSetupMultisigState('ENTER_MULTISIG_CONFIG');

      if (e instanceof Error) {
        setMultisigConfigError(e.message);
      } else {
        setMultisigConfigError(String(e));
      }
    } finally {
      setBlockedEvent(false);
    }
  }, [blockedEvent, _createMultisigAccount, setSetupMultisigState, setMultisigConfigError]);

  const resetMultisigConfig = React.useCallback(() => {
    setMultisigConfig({ ...DEFAULT_MULTISIG_CONFIG });
    setMultisigConfigError(null);
  }, []);

  return {
    setupMultisigState,
    setSetupMultisigState,
    initSetup,
    indicatorInfo,
    multisigConfig,
    updateSigner,
    addSigner,
    removeSigner,
    validateMultisigConfig,
    multisigAccountMode,
    setMultisigAccountMode,
    multisigConfigError,
    updateThreshold,
    createMultisigAccount,
    createdMultisigAddress,
    resetMultisigConfig,
  };
};

export default useSetupMultisigScreen;
