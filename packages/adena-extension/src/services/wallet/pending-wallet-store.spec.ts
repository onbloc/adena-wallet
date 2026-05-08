import { AdenaWallet } from 'adena-module';

import { pendingWalletStore } from './pending-wallet-store';

function makeWalletStub(): { wallet: AdenaWallet; destroy: jest.Mock } {
  const destroy = jest.fn();
  const wallet = { destroy } as unknown as AdenaWallet;
  return { wallet, destroy };
}

describe('pendingWalletStore', () => {
  beforeEach(() => {
    pendingWalletStore.clear();
  });

  it('starts empty', () => {
    expect(pendingWalletStore.has()).toBe(false);
    expect(pendingWalletStore.consume()).toBeNull();
  });

  it('set then consume returns the wallet and empties the store', () => {
    const { wallet } = makeWalletStub();

    pendingWalletStore.set(wallet);
    expect(pendingWalletStore.has()).toBe(true);

    expect(pendingWalletStore.consume()).toBe(wallet);
    expect(pendingWalletStore.has()).toBe(false);
    expect(pendingWalletStore.consume()).toBeNull();
  });

  it('overwriting a pending wallet destroys the previous one', () => {
    const first = makeWalletStub();
    const second = makeWalletStub();

    pendingWalletStore.set(first.wallet);
    pendingWalletStore.set(second.wallet);

    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(second.destroy).not.toHaveBeenCalled();
    expect(pendingWalletStore.consume()).toBe(second.wallet);
  });

  it('clear destroys the pending wallet and empties the store', () => {
    const { wallet, destroy } = makeWalletStub();
    pendingWalletStore.set(wallet);

    pendingWalletStore.clear();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(pendingWalletStore.has()).toBe(false);
  });

  it('clear is a no-op when empty', () => {
    expect(() => pendingWalletStore.clear()).not.toThrow();
    expect(pendingWalletStore.has()).toBe(false);
  });

  it('consume does not call destroy — caller owns the lifetime', () => {
    const { wallet, destroy } = makeWalletStub();
    pendingWalletStore.set(wallet);

    pendingWalletStore.consume();

    expect(destroy).not.toHaveBeenCalled();
  });
});
