import { EVENT_KEYS } from '@common/constants/event-key.constant';
import {
  AdenaExecutor,
  RequestAddedNetworkMessage,
  RequestDocontractMessage,
} from './inject/executor/executor';

function callbackCustomEvent<T>(event: CustomEvent<T>, callback: (message: T) => void) {
  event.stopImmediatePropagation();
  callback(event.detail);
}

const init = () => {
  const adena = {
    async AddEstablish(name: string) {
      const executor = new AdenaExecutor();
      const response = await executor.addEstablish(name);
      return response;
    },
    async DoContract(mesasage: RequestDocontractMessage) {
      const executor = new AdenaExecutor();
      const response = await executor.doContract(mesasage);
      return response;
    },
    async GetAccount() {
      const executor = new AdenaExecutor();
      const response = await executor.getAccount();
      return response;
    },
    async Sign(mesasage: RequestDocontractMessage) {
      const executor = new AdenaExecutor();
      const response = await executor.signAmino(mesasage);
      return response;
    },
    async MakeTx(mesasage: RequestDocontractMessage) {
      const executor = new AdenaExecutor();
      const response = await executor.makeTx(mesasage);
      return response;
    },
    async AddNetwork(chain: RequestAddedNetworkMessage) {
      const executor = new AdenaExecutor();
      const response = await executor.addNetwork(chain);
      return response;
    },
    async SwitchNetwork(chainId: string) {
      const executor = new AdenaExecutor();
      const response = await executor.switchNetwork(chainId);
      return response;
    },
    On(eventName: string, callback: (message: string) => void) {
      switch (eventName) {
        case 'changedAccount':
        case 'changedNetwork':
          window.addEventListener<typeof EVENT_KEYS[typeof eventName]>(
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
