export const createMessageOfVmAddPacakge = (info: {
  creator: string;
  deposit: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageInfo?: any;
}) => {
  return {
    type: '/vm.m_addpkg',
    value: info.packageInfo
      ? {
          creator: info.creator,
          package: info.packageInfo,
          deposit: info.deposit,
        }
      : {
          creator: info.creator,
          deposit: info.deposit,
        },
  };
};

export const createMessageOfVmCall = (info: {
  caller: string;
  send: string;
  pkgPath: string;
  func: string;
  args: Array<string>;
}) => {
  return {
    type: '/vm.m_call',
    value: {
      caller: info.caller,
      send: info.send,
      pkg_path: info.pkgPath,
      func: info.func,
      args: info.args,
    },
  };
};

export const createMessageOfVmRun = (info: {
  caller: string;
  send: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageInfo: any;
}) => {
  return {
    type: '/vm.m_run',
    value: {
      caller: info.caller,
      send: info.send,
      package: info.packageInfo
    },
  };
};
