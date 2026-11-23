import { WalletStatus } from '../../../src/services/wallet.service';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';

describe('SessionStatus', () => {
  it('extends wallet statuses with booting', () => {
    expect(SessionStatus).toEqual({ BOOTING: 'booting', ...WalletStatus });
  });
});

describe('useSessionStore', () => {
  it('starts booting at revision 0', () => {
    expect(useSessionStore.getState()).toMatchObject({ status: SessionStatus.BOOTING, revision: 0 });
  });

  it('updates the status and bumps the revision', () => {
    useSessionStore.getState().setStatus(SessionStatus.UNLOCKED);
    useSessionStore.getState().bumpRevision();
    useSessionStore.getState().bumpRevision();
    expect(useSessionStore.getState()).toMatchObject({ status: 'unlocked', revision: 2 });
  });
});
