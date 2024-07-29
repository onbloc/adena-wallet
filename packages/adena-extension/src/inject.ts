import { EVENT_KEYS } from '@common/constants/event-key.constant';
import {
  AdenaExecutor,
  RequestAddedNetworkMessage,
  RequestDoContractMessage,
} from './inject/executor/executor';
import manifest from '@public/manifest.json';

function callbackCustomEvent<T>(event: CustomEvent<T>, callback: (message: T) => void): void {
  event.stopImmediatePropagation();
  callback(event.detail);
}

const init = (): void => {
  const adena = {
    version: manifest.version,
    async AddEstablish(name: string): Promise<unknown> {
      const executor = new AdenaExecutor();
      const response = await executor.addEstablish(name);
      return response;
    },
    async CheckConnection(name: string): Promise<unknown> {
      const executor = new AdenaExecutor();
      const response = await executor.checkConnection(name);
      return response;
    },
    async DoContract(message: RequestDoContractMessage): Promise<unknown> {
      const executor = new AdenaExecutor();
      const response = await executor.doContract(message);
      return response;
    },
    async GetAccount(): Promise<unknown> {
      const executor = new AdenaExecutor();
      const response = await executor.getAccount();
      return response;
    },
    async Sign(message: RequestDoContractMessage): Promise<unknown> {
      const executor = new AdenaExecutor();
      const response = await executor.signAmino(message);
      return response;
    },
    async SignTx(message: RequestDoContractMessage): Promise<unknown> {
      const executor = new AdenaExecutor();
      const response = await executor.signTx(message);
      return response;
    },
    async AddNetwork(chain: RequestAddedNetworkMessage): Promise<unknown> {
      const executor = new AdenaExecutor();
      const response = await executor.addNetwork(chain);
      return response;
    },
    async SwitchNetwork(chainId: string): Promise<unknown> {
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

  window.adena = adena;
};

init();
