import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';

import { SelectAccountOption, SelectAccountsPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { OnboardingStackParamList } from '../../../navigation/types';
import { HdAccountCandidate, HdAccountPreview } from '../../../services/hd-account-preview';
import { useOnboardingStore } from '../../../stores/onboarding.store';
import { useToastStore } from '../../../stores/toast.store';
import { compareAmount, formatTokenAmount } from '../../../utils/amount';

export const ACCOUNT_PAGE_SIZE = 5;

interface Candidate extends HdAccountCandidate {
  balance?: string | null;
}

// Lists the phrase's accounts by HD index (m/44'/118'/0'/0/{index}), five at a time.
// The first account and any account holding a balance start selected.
export const SelectAccountsScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'SelectAccounts'>): ReactElement => {
  const { chainRegistry, networkService } = useContainer();
  const mnemonic = useOnboardingStore(state => state.mnemonic);
  const setHdIndexes = useOnboardingStore(state => state.setHdIndexes);
  const showToast = useToastStore(state => state.show);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set([0]));
  const [loadingMore, setLoadingMore] = useState(false);
  const previewRef = useRef<HdAccountPreview | null>(null);
  const loadingRef = useRef(false);
  // Indexes the user toggled; a balance that arrives later never overrides their choice.
  const touchedRef = useRef(new Set<number>());

  const load = async (from: number): Promise<void> => {
    const preview = previewRef.current;

    if (!preview || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoadingMore(from > 0);

    try {
      const page = await preview.derive(from, ACCOUNT_PAGE_SIZE);

      if (previewRef.current !== preview) {
        return;
      }

      setCandidates(current => [...current, ...page]);
      const network = networkService.getCurrentNetwork();

      page.forEach(async ({ hdIndex, address }) => {
        const balance = await preview.getNativeBalance(address);

        if (previewRef.current !== preview) {
          return;
        }

        const hasFunds = balance !== null && compareAmount(balance.amount, '0') > 0;
        const text = balance === null ? null : `${formatTokenAmount(balance.amount, balance.decimals, 6)} ${balance.symbol || network.nativeToken.symbol}`;

        setCandidates(current => current.map(item => (item.hdIndex === hdIndex ? { ...item, balance: text } : item)));

        if (hasFunds && !touchedRef.current.has(hdIndex)) {
          setSelected(current => new Set(current).add(hdIndex));
        }
      });
    }
    catch (error) {
      showToast(toErrorMessage(error), 'error');

      if (from === 0) {
        navigation.goBack();
      }
    }
    finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!mnemonic) {
      navigation.goBack();
      return;
    }

    const preview = new HdAccountPreview(mnemonic, chainRegistry, networkService.getCurrentNetwork());

    previewRef.current = preview;
    void load(0);

    return (): void => {
      previewRef.current = null;
      preview.destroy();
    };
    // Rebuilt only for a new phrase.
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [mnemonic]);

  const handleToggle = (hdIndex: number): void => {
    touchedRef.current.add(hdIndex);
    setSelected((current) => {
      const next = new Set(current);

      if (!next.delete(hdIndex)) {
        next.add(hdIndex);
      }

      return next;
    });
  };

  const handleSubmit = (): void => {
    const indexes = candidates.map(candidate => candidate.hdIndex).filter(hdIndex => selected.has(hdIndex));

    if (indexes.length === 0) {
      return;
    }

    setHdIndexes(indexes);
    navigation.navigate('ProtectWallet');
  };

  const accounts: SelectAccountOption[] = candidates.map(candidate => ({
    hdIndex: candidate.hdIndex,
    name: `Account ${candidate.hdIndex + 1}`,
    address: candidate.address,
    balance: candidate.balance,
    selected: selected.has(candidate.hdIndex),
  }));

  return (
    <SelectAccountsPage
      accounts={accounts}
      loading={candidates.length === 0}
      loadingMore={loadingMore}
      onToggle={handleToggle}
      onLoadMore={() => void load(candidates.length)}
      onSubmit={handleSubmit}
      onBack={navigation.goBack}
    />
  );
};
