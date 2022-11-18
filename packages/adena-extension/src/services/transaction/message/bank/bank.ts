export const createMessageOfBankSend = (info: {
  fromAddress: string;
  toAddress: string;
  amount: string;
}) => {
  return {
    type: '/bank.MsgSend',
    value: {
      from_address: info.fromAddress,
      to_address: info.toAddress,
      amount: info.amount,
    },
  };
};
