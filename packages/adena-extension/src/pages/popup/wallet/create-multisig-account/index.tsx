import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { CreateMultisigAccount } from '@components/molecules/create-multisig-account';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { MultisigConfig } from '@inject/types';
import { RoutePath } from '@types';

const CreateMultisigAccountContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { walletService, transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const location = useLocation();

  const [hostname, setHostname] = useState('');
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [multisigConfig, setMultisigConfig] = useState<MultisigConfig | null>(null);
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);

  const processing = useMemo(() => processType !== 'INIT', [processType]);
  const done = useMemo(() => processType === 'DONE', [processType]);

  useEffect(() => {
    checkLockWallet();
  }, [walletService]);

  const checkLockWallet = (): void => {
    walletService
      .isLocked()
      .then((locked) => locked && normalNavigate(RoutePath.ApproveLogin + location.search));
  };

  useEffect(() => {
    if (location.search) {
      initRequestData();
    }
  }, [location]);

  const initRequestData = (): void => {
    const data = parseParameters(location.search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });
  };

  useEffect(() => {
    if (currentAccount && requestData) {
      initFavicon();
      initMultisigConfig();
    }
  }, [currentAccount, requestData]);

  const initFavicon = async (): Promise<void> => {
    const faviconData = await createFaviconByHostname(
      requestData?.hostname ? `${requestData?.protocol}//${requestData?.hostname}` : '',
    );
    setFavicon(faviconData);
  };

  const initMultisigConfig = (): void => {
    if (!requestData?.data) {
      return;
    }

    const { signers, threshold } = requestData.data;

    setMultisigConfig({
      signers,
      threshold,
    });
    setHostname(requestData?.hostname ?? '');
  };

  const createMultisigAccount = async (): Promise<void> => {
    if (!multisigConfig) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {},
          requestData?.key,
        ),
      );
      return;
    }
    try {
      setProcessType('PROCESSING');

      const multisigAddress = await transactionService.createMultisigAccount(multisigConfig);

      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.CREATE_MULTISIG_ACCOUNT_SUCCESS,
          {
            multisigConfig,
            address: multisigAddress,
          },
          requestData?.key,
        ),
      );
    } catch (e) {
      if (e instanceof Error) {
        const message = e.message;
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.CREATE_MULTISIG_ACCOUNT_FAILED,
            { error: { message } },
            requestData?.key,
          ),
        );
      }
    } finally {
      setProcessType('DONE');
    }
  };

  const onClickConfirm = (): void => {
    if (!currentAccount) {
      return;
    }
    createMultisigAccount();
  };

  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseRejectType.CREATE_MULTISIG_ACCOUNT_REJECTED,
        {},
        requestData?.key,
      ),
    );
  };

  const onResponse = useCallback(() => {
    if (response) {
      chrome.runtime.sendMessage(response);
    }
  }, [response]);

  return (
    <CreateMultisigAccount
      title='Create Multisig Account'
      domain={hostname}
      logo={favicon}
      loading={multisigConfig === null}
      processing={processing}
      done={done}
      multisigConfig={multisigConfig}
      onClickConfirm={onClickConfirm}
      onClickCancel={onClickCancel}
      onResponse={onResponse}
    />
  );
};

export default CreateMultisigAccountContainer;
