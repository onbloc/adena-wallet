import { AdenaExecutor, RequestDocontractMessage } from './inject/executor/executor';

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
  };

  window.adena = adena;
};

init();
