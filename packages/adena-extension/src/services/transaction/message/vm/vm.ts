export const createMessageOfVmAddPackage = (info: {
  creator: string;
  deposit: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageInfo?: any;
}): {
  type: string;
  value:
    | { creator: string; package: any; deposit: string }
    | { creator: string; deposit: string; package?: undefined };
} => {
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
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
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
}): { type: string; value: { caller: string; send: string; package: any } } => {
  return {
    type: '/vm.m_run',
    value: {
      caller: info.caller,
      send: info.send,
      package: info.packageInfo,
    },
  };
};

export const createMessageOfVmNoop = (info: {
  caller: string;
}): {
  type: string;
  value: { caller: string;};
} => {
  return {
    type: '/vm.m_noop',
    value: {
      caller: info.caller,
    },
  };
};