import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { stringFromBase64 } from '@common/utils/encoding-util';
import { View, WebButton, WebText } from '@components/atoms';
import { WebSeedValidateInputItem } from '@components/atoms/web-seed-validate-input-item';
import { WebTitleWithDescription } from '@components/molecules';
import { UseWalletCreateReturn } from '@hooks/web/use-wallet-create-screen';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const ValidateMnemonicStep = ({
  useWalletCreateScreenReturn,
}: {
  useWalletCreateScreenReturn: UseWalletCreateReturn;
}): ReactElement => {
  const { seeds, onClickNext } = useWalletCreateScreenReturn;

  const [firstSeed, setFirstSeed] = useState('');
  const [secondSeed, setSecondSeed] = useState('');
  const [firstSeedError, setFirstSeedError] = useState(false);
  const [secondSeedError, setSecondSeedError] = useState(false);

  const [validateSeedIndexes, setValidateSeedIndexes] = useState<number[]>([]);

  const availableToNext = useMemo(() => {
    return firstSeed.length > 0 && secondSeed.length > 0;
  }, [firstSeed, secondSeed]);

  const hasValidatedIndexes = useMemo(() => {
    return validateSeedIndexes.length === 2;
  }, [validateSeedIndexes]);

  const validate = useCallback(() => {
    if (!availableToNext || validateSeedIndexes.length !== 2) {
      return;
    }

    let currentSeeds = stringFromBase64(seeds);

    const currentSeedsArray = currentSeeds.split(' ');
    const firstSeedIndex = currentSeedsArray.findIndex((word) => word === firstSeed);
    const secondSeedIndex = currentSeedsArray.findIndex((word) => word === secondSeed);

    currentSeeds = '';

    const isValidateFirstSeed = firstSeedIndex === validateSeedIndexes[0];
    const isValidateSecondSeed = secondSeedIndex === validateSeedIndexes[1];

    if (!isValidateFirstSeed) {
      setFirstSeedError(true);
    }
    if (!isValidateSecondSeed) {
      setSecondSeedError(true);
    }

    if (isValidateFirstSeed && isValidateSecondSeed) {
      onClickNext();
    }
  }, [firstSeed, secondSeed, seeds, validateSeedIndexes, availableToNext, onClickNext]);

  const onChangeFirstSeed = useCallback((value: string) => {
    setFirstSeed(value);
    setFirstSeedError(false);
  }, []);

  const onChangeSecondSeed = useCallback((value: string) => {
    setSecondSeed(value);
    setSecondSeedError(false);
  }, []);
  useEffect(() => {
    const randomIndexes = Array.from({ length: 2 }, () => Math.floor(Math.random() * 12)).sort(
      (a, b) => a - b,
    );
    setValidateSeedIndexes(randomIndexes);
  }, []);

  return (
    <StyledContainer>
      <WebTitleWithDescription
        title='Verify Your Seed Phrase'
        description='Enter the requested words from your seed phrase in the fields below.'
        marginBottom={-6}
      />

      {hasValidatedIndexes && (
        <View style={{ width: '100%', gap: 16 }}>
          <WebSeedValidateInputItem
            index={validateSeedIndexes[0]}
            value={firstSeed}
            error={firstSeedError}
            onChange={onChangeFirstSeed}
          />
          <WebSeedValidateInputItem
            index={validateSeedIndexes[1]}
            value={secondSeed}
            error={secondSeedError}
            onChange={onChangeSecondSeed}
          />
        </View>
      )}

      <WebButton
        figure='primary'
        size='small'
        onClick={validate}
        disabled={!availableToNext}
        style={{ justifyContent: 'center' }}
      >
        <WebText type='title4'>Reveal Seed Phrase</WebText>
      </WebButton>
    </StyledContainer>
  );
};

export default ValidateMnemonicStep;
