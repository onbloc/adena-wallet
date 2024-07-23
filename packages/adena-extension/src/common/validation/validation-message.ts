export const validateDoContractRequest = (requestData: any): boolean => {
  if (typeof requestData?.gasFee !== 'number') {
    if (Number.isNaN(parseInt(`${requestData?.gasFee}`))) {
      return false;
    }
  }
  if (typeof requestData?.gasWanted !== 'number') {
    if (Number.isNaN(parseInt(`${requestData?.gasWanted}`))) {
      return false;
    }
  }
  if (!Array.isArray(requestData?.messages)) {
    return false;
  }
  return true;
};

export const validateTransactionMessageOfBankSend = (message: {
  [key in string]: any;
}): boolean => {
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

export const validateTransactionMessageOfVmCall = (message: { [key in string]: any }): boolean => {
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

export const validateTransactionMessageOfAddPkg = (message: { [key in string]: any }): boolean => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/vm.m_addpkg') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (typeof message.value.creator !== 'string') {
    return false;
  }
  if (typeof message.value.deposit !== 'string') {
    return false;
  }
  if (typeof message.value.package !== 'object') {
    return false;
  }

  const packageValue = message.value.package;
  if (typeof packageValue?.Name !== 'string' && typeof packageValue?.name !== 'string') {
    return false;
  }
  if (typeof packageValue?.Path !== 'string' && typeof packageValue?.path !== 'string') {
    return false;
  }
  if (!Array.isArray(packageValue?.Files) && !Array.isArray(packageValue?.files)) {
    return false;
  }
  return true;
};

export const validateTransactionMessageOfRun = (message: { [key in string]: any }): boolean => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/vm.m_run') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (typeof message.value.caller !== 'string') {
    return false;
  }
  if (typeof message.value.send !== 'string') {
    return false;
  }
  if (typeof message.value.package !== 'object') {
    return false;
  }

  const packageValue = message.value.package;
  if (typeof packageValue?.Name !== 'string' && typeof packageValue?.name !== 'string') {
    return false;
  }
  if (typeof packageValue?.Path !== 'string' && typeof packageValue?.path !== 'string') {
    return false;
  }
  if (!Array.isArray(packageValue?.Files) && !Array.isArray(packageValue?.files)) {
    return false;
  }
  return true;
};

export const validateTransactionMessageOfVmNoop = (message: { [key in string]: any }): boolean => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/vm.m_noop') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (Object.keys(message.value).indexOf('caller') === -1) {
    return false;
  }
  return true;
};
