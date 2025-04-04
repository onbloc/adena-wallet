import { ContractMessage } from '@inject/types';

export function mappedTransactionMessages(
  messages: {
    type: string;
    value: any;
  }[],
): ContractMessage[] {
  return messages
    .map((message) => {
      switch (message.type) {
        case '/bank.MsgSend':
          return {
            type: '/bank.MsgSend',
            value: message.value,
          };
        case '/vm.m_call':
          return {
            type: '/vm.m_call',
            value: message.value,
          };
        case '/vm.m_addpkg':
          return {
            type: '/vm.m_addpkg',
            value: message.value,
          };
        case '/vm.m_run':
          return {
            type: '/vm.m_run',
            value: message.value,
          };
      }
      return null;
    })
    .filter((message) => message !== null) as ContractMessage[];
}
