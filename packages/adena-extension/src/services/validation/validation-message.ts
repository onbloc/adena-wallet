export const validateDoContractRequest = (requestData: { [key in string]: any }) => {
  if (!requestData.gasFee || !requestData.gasWanted || !requestData.message) {
    return false;
  }
  if (typeof requestData.gasFee !== 'number') {
    return false;
  }
  if (typeof requestData.gasWanted !== 'number') {
    return false;
  }
  if (!requestData.message.type) {
    return false;
  }
  return true;
};

export const validateTrasactionMessageOfBankSend = (message: { [key in string]: any }) => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/bank.MsgSend') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (!message.value.to_address || typeof message.value.to_address !== 'string') {
    return false;
  }
  if (!message.value.from_address || typeof message.value.from_address !== 'string') {
    return false;
  }
  if (!message.value.amount || typeof message.value.amount !== 'string') {
    return false;
  }

  return true;
};

export const validateTrasactionMessageOfVmCall = (message: { [key in string]: any }) => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/vm.m_call') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (Object.keys(message.value).indexOf('caller') === -1) {
    return false;
  }
  if (Object.keys(message.value).indexOf('send') === -1) {
    return false;
  }
  if (Object.keys(message.value).indexOf('pkg_path') === -1) {
    return false;
  }
  if (Object.keys(message.value).indexOf('func') === -1) {
    return false;
  }
  if (Object.keys(message.value).indexOf('args') === -1) {
    return false;
  }

  return true;
};
