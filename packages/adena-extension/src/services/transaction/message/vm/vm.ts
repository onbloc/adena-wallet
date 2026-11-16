export const createMessageOfVmAddPackage = (info: {
  creator: string;
  max_deposit: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageInfo?: any;
}): {
  type: string;
  value:
    | { creator: string; package: any; max_deposit: string }
    | { creator: string; max_deposit: string; package?: undefined };
} => {
  return {
    type: '/vm.m_addpkg',
    value: info.packageInfo
      ? {
          creator: info.creator,
          package: info.packageInfo,
          max_deposit: info.max_deposit,
        }
      : {
          creator: info.creator,
          max_deposit: info.max_deposit,
        },
  };
};

export const createMessageOfVmCall = (info: {
  caller: string;
  send: string;
  max_deposit: string;
  pkgPath: string;
  func: string;
  args: Array<string>;
}): {
  type: string;
  value: {
    caller: string;
    send: string;
    max_deposit: string;
    pkg_path: string;
    func: string;
    args: string[];
  };
} => {
  return {
    type: '/vm.m_call',
    value: {
      caller: info.caller,
      send: info.send,
      max_deposit: info.max_deposit,
      pkg_path: info.pkgPath,
      func: info.func,
      args: info.args,
    },
  };
};

export const createMessageOfVmRun = (info: {
  caller: string;
  send: string;
  max_deposit: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageInfo: any;
}): {
  type: string;
  value: { caller: string; send: string; max_deposit: string; package: any };
} => {
  return {
    type: '/vm.m_run',
    value: {
      caller: info.caller,
      send: info.send,
      max_deposit: info.max_deposit,
      package: info.packageInfo,
    },
  };
};
