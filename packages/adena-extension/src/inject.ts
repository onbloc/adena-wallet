import { AdenaWallet, WalletResponse } from '@adena-wallet/sdk';
import manifest from '@public/manifest.json';

import { EVENT_KEYS } from '@common/constants/event-key.constant';

import { AdenaExecutor } from './inject/executor/executor';
import {
  AddEstablishResponse,
  AddNetworkParams,
  AddNetworkResponse,
  DoContractResponse,
  GetAccountResponse,
  GetNetworkResponse,
  SignedDocument,
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
      withNotification = true,
    ): Promise<DoContractResponse> {
      const executor = new AdenaExecutor();
      const response = await executor.doContract(message, withNotification);
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
      console.log('시작 1! SignTx');
      const executor = new AdenaExecutor();
      const response = await executor.signTx(message);
      return response;
    },
    async SignDocument2(signedDocument: SignedDocument) {
      console.log('시작 1! SignDocument2');
      const executor = new AdenaExecutor();
      console.log('1-1');
      const response = await executor.signDocument2(signedDocument);
      console.log('1-2');
      return response;
    },
    async SignDocument(message: TransactionParams) {
      console.log('시작 1! SignDocument');
      const executor = new AdenaExecutor();
      console.log('1-1');
      const response = await executor.signDocument(message);
      console.log('1-2');
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
