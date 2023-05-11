import { EVENT_KEYS } from '@common/constants/event-key.constant';
import { AdenaExecutor, RequestDocontractMessage } from './inject/executor/executor';

function callbackCustomEvent(event: CustomEvent, callback: (message: any) => void) {
  event.stopImmediatePropagation();
  callback(event.detail);
}

const init = () => {
  const adena = {
    async AddEstablish(name: string) {
      const executor = new AdenaExecutor();
      const response = await executor.AddEstablish(name);
      return response;
    },
    async DoContract(mesasage: RequestDocontractMessage) {
      const executor = new AdenaExecutor();
      const response = await executor.DoContract(mesasage);
      return response;
    },
    async GetAccount() {
      const executor = new AdenaExecutor();
      const response = await executor.GetAccount();
      return response;
    },
    async Sign(mesasage: RequestDocontractMessage) {
      const executor = new AdenaExecutor();
      const response = await executor.SignAmino(mesasage);
      return response;
    },
    On(eventName: string, callback: (message: CustomEvent) => void) {
      switch (eventName) {
        case 'changedAccount':
        case 'changedNetwork':
          window.addEventListener<any>(
            EVENT_KEYS[eventName],
            (event: CustomEvent) => callbackCustomEvent(event, callback),
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
