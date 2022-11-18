import { createMessageOfVmCall } from './vm';

export const createMessageOfVmRegister = (info: {
  address: string;
  accountName: string;
  accountProfile: string;
  invitor?: string;
  send?: string;
}) => {
  const invitor = info.invitor ?? '';
  const send = info.send ?? '200000000ugnot';
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/users',
    func: 'Register',
    args: [invitor, info.accountName, info.accountProfile],
    send: send,
  });
};

export const createMessageOfVmInvite = (info: { address: string; invitee: string }) => {
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/users',
    func: 'Invite',
    args: [info.invitee],
    send: '',
  });
};
