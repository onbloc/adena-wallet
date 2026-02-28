import { AdenaWallet, WalletResponse } from '@adena-wallet/sdk';
import manifest from '@public/manifest.json';

import { EVENT_KEYS } from '@common/constants/event-key.constant';

import { AdenaExecutor } from './inject/executor/executor';
import {
  AddEstablishResponse,
  AddNetworkParams,
  AddNetworkResponse,
  BroadcastMultisigTransactionResponse,
  ContractOptions,
  CreateMultisigAccountParams,
  CreateMultisigAccountResponse,
  CreateMultisigTransactionParams,
  CreateMultisigTransactionResponse,
  DoContractResponse,
  GetAccountResponse,
  GetNetworkResponse,
  MultisigTransactionDocument,
  Signature,
  SignMultisigTransactionResponse,
  SignTxResponse,
  SwitchNetworkResponse,
  TransactionParams,
} from './inject/types';

function callbackCustomEvent<T>(event: CustomEvent<T>, callback: (message: T) => void): void {
  event.stopImmediatePropagation();
  callback(event.detail);
}

const init = (): void => {
  const adena = {
    version: manifest.version,
    async AddEstablish(name: string): Promise<AddEstablishResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.addEstablish(name);
      return response;
    },
    async DoContract(
      message: TransactionParams,
      options?: ContractOptions | boolean,
    ): Promise<DoContractResponse> {
      const executor = new AdenaExecutor();

      // Supports boolean for backward compatibility with the previous API signature
      const resolved =
        typeof options === 'boolean'
          ? { withNotification: options, isVisibleResult: options }
          : options;
      const { withNotification = true, isVisibleResult = true } = resolved ?? {};
      const response = await executor.doContract(message, { withNotification, isVisibleResult });
      return response;
    },
    async GetAccount(): Promise<GetAccountResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.getAccount();
      return response;
    },
    async GetNetwork(): Promise<GetNetworkResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.getNetwork();
      return response;
    },
    async Sign(message: TransactionParams): Promise<WalletResponse<unknown>> {
      const executor = new AdenaExecutor();
      const response = await executor.signAmino(message);
      return response;
    },
    async SignTx(message: TransactionParams): Promise<SignTxResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.signTx(message);
      return response;
    },
    async CreateMultisigAccount(
      params: CreateMultisigAccountParams,
    ): Promise<CreateMultisigAccountResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.createMultisigAccount(params);
      return response;
    },
    async CreateMultisigTransaction(
      params: CreateMultisigTransactionParams,
      withSaveFile = false,
    ): Promise<CreateMultisigTransactionResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.createMultisigTransaction(params, withSaveFile);
      return response;
    },
    async SignMultisigTransaction(
      multisigDocument: MultisigTransactionDocument,
      multisigSignatures?: Signature[],
      withSaveFile = false,
    ): Promise<SignMultisigTransactionResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.signMultisigTransaction(
        multisigDocument,
        multisigSignatures,
        withSaveFile,
      );
      return response;
    },
    async BroadcastMultisigTransaction(
      multisigDocument: MultisigTransactionDocument,
      multisigSignatures?: Signature[],
      options?: ContractOptions,
    ): Promise<BroadcastMultisigTransactionResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.broadcastMultisigTransaction(
        multisigDocument,
        multisigSignatures,
        options,
      );
      return response;
    },
    async AddNetwork(chain: AddNetworkParams): Promise<AddNetworkResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.addNetwork(chain);
      return response;
    },
    async SwitchNetwork(chainId: string): Promise<SwitchNetworkResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.switchNetwork(chainId);
      return response;
    },
    On(eventName: string, callback: (message: string) => void): boolean {
      switch (eventName) {
        case 'changedAccount':
        case 'changedNetwork':
          window.addEventListener<(typeof EVENT_KEYS)[typeof eventName]>(
            EVENT_KEYS[eventName],
            (event) => callbackCustomEvent<string>(event, callback),
            true,
          );
          return true;
        default:
          break;
      }
      return false;
    },
  };

  window.adena = adena as unknown as AdenaWallet;
};

init();
