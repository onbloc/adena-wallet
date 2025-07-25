import { TRANSACTION_MESSAGE_SEND_OF_REGISTER } from '@common/constants/tx.constant';
import { createMessageOfVmCall } from './vm';

export const createMessageOfVmRegister = (info: {
  address: string;
  accountName: string;
  accountProfile: string;
  invitor?: string;
  send?: string;
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
  const invitor = info.invitor ?? '';
  const send = info.send ?? TRANSACTION_MESSAGE_SEND_OF_REGISTER;
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/users',
    max_deposit: '',
    func: 'Register',
    args: [invitor, info.accountName, info.accountProfile],
    send: send,
  });
};

export const createMessageOfVmInvite = (info: {
  address: string;
  invitee: string;
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/users',
    max_deposit: '',
    func: 'Invite',
    args: [info.invitee],
    send: '',
  });
};
