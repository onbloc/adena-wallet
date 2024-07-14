export const makeGRC20ReceivedTransactionsByAddressQuery = (address: string): string => `
{
  transactions(filter: {
    message: {
      type_url: exec
      vm_param: {
        exec: {
          func: "Transfer"
          args: ["${address}"]
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        __typename
        ...on MsgCall {
          caller
          send
          pkg_path
          func
          args
        }
      }
    }
  }
}
`;

export const makeVMTransactionsByAddressQuery = (address: string): string => `
{
  transactions(filter: {
    message: {
      route: vm
      vm_param: {
        exec: {
          caller: "${address}"
        }
        add_package: {
          creator: "${address}"
        }
        run: {
          caller: "${address}"
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        __typename
        ... on BankMsgSend {
          from_address
          to_address
          amount
        }
        ... on MsgCall {
          caller
          send
          func
          pkg_path
          args
        }
        ... on MsgAddPackage {
          creator
          package {
            path
          }
        }
        ... on MsgRun {
          caller
          send
          package {
            path
          }
        }
      }
    }
  }
}
`;

export const makeNativeTokenSendTransactionsByAddressQuery = (address: string): string => `
{
  transactions(filter: {
    message: {
      type_url: send
      bank_param: {
        send: {
          from_address: "${address}"
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        __typename
        ...on BankMsgSend{
          from_address
          to_address
          amount
        }
      }
    }
  }
}
`;

export const makeNativeTokenReceivedTransactionsByAddressQuery = (address: string): string => `
{
  transactions(filter: {
    message: {
      type_url: send
      bank_param: {
        send: {
          to_address: "${address}"
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        __typename
        ...on BankMsgSend{
          from_address
          to_address
          amount
        }
      }
    }
  }
}
`;

export const makeGRC20ReceivedTransactionsByAddressQueryByPackagePath = (
  address: string,
  packagePath: string,
): string => `
{
  transactions(filter: {
    message: {
      type_url: exec
      vm_param: {
        exec: {
          func: "Transfer"
          pkg_path: "${packagePath}"
          args: ["${address}"]
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        __typename
        ...on MsgCall {
          caller
          send
          pkg_path
          func
          args
        }
      }
    }
  }
}
`;

export const makeGRC20SendTransactionsByAddressQueryByPackagePath = (
  address: string,
  packagePath: string,
): string => `
{
  transactions(filter: {
    message: {
      type_url: exec
      vm_param: {
        exec: {
          pkg_path: "${packagePath}"
          caller: "${address}"
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        __typename
        ... on MsgCall {
          caller
          send
          func
          pkg_path
          args
        }
      }
    }
  }
}
`;
