import { useContainer } from '../../di/container-provider';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../stores/session.store';
import { useToastStore } from '../../stores/toast.store';

// Leaves onboarding once the wallet exists: into the app, to the lock screen, or back to the start after a reset.
// Resolves false only when the wallet is gone and onboarding starts over.
export const useFinishOnboarding = (): ((navigation: { popToTop: () => void }) => Promise<boolean>) => {
  const { walletService } = useContainer();
  const clearOnboarding = useOnboardingStore(state => state.clear);
  const { setStatus, bumpRevision } = useSessionStore();
  const showToast = useToastStore(state => state.show);

  return async (navigation) => {
    // A biometric prompt can outlive a lock (e.g. the error boundary); never reopen a closed session.
    const status = await walletService.getStatus().catch(() => SessionStatus.LOCKED);

    clearOnboarding();
    bumpRevision();

    if (status === SessionStatus.EMPTY) {
      // A reset removed the new wallet meanwhile; start onboarding over.
      navigation.popToTop();
      return false;
    }

    if (status !== SessionStatus.UNLOCKED) {
      walletService.lock();
      showToast('Your wallet was saved. Unlock it to continue.', 'warning');
      setStatus(SessionStatus.LOCKED);
      return true;
    }

    setStatus(SessionStatus.UNLOCKED);
    return true;
  };
};
