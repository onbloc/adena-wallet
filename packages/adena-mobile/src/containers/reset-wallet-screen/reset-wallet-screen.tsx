import { useNavigation } from '@react-navigation/native';
import React, { ReactElement, useState } from 'react';

import { ResetWalletPage } from '../../components/pages';
import { toErrorMessage } from '../../core/error-message';
import { useFactoryReset } from '../../hooks/use-factory-reset';

// Reachable from Settings (unlocked) and from the unlock screen (forgot password).
export const ResetWalletScreen = (): ReactElement => {
  const navigation = useNavigation();
  const reset = useFactoryReset();
  const [acknowledged, setAcknowledged] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string>();

  const handleReset = async (): Promise<void> => {
    setResetting(true);
    setError(undefined);

    try {
      await reset();
    }
    catch (resetError) {
      setError(toErrorMessage(resetError));
      setResetting(false);
    }
  };

  return (
    <ResetWalletPage
      acknowledged={acknowledged}
      onToggleAcknowledged={setAcknowledged}
      resetting={resetting}
      error={error}
      onReset={handleReset}
      onBack={navigation.goBack}
    />
  );
};
