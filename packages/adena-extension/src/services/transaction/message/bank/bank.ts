export const createMessageOfBankSend = (info: {
  fromAddress: string;
  toAddress: string;
  amount: string;
}): {
  type: string;
  value: {
    from_address: string;
    to_address: string;
    amount: string;
  };
} => {
  return {
    type: '/bank.MsgSend',
    value: {
      from_address: info.fromAddress,
      to_address: info.toAddress,
      amount: info.amount,
    },
  };
};
