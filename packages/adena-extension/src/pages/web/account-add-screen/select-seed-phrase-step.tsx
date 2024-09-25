import { ReactElement, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { View, WebButton } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import SelectSeedPhraseBox from '@components/molecules/select-seed-phrase-box/select-seed-phrase-box';
import { UseAccountAddScreenReturn } from '@hooks/web/use-account-add-screen';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const SelectSeedPhraseStep = ({
  selectedKeyringId,
  setSelectedKeyringId,
  useAccountAddScreenReturn,
}: {
  selectedKeyringId?: string;
  setSelectedKeyringId: (keyringId?: string) => void;
  useAccountAddScreenReturn: UseAccountAddScreenReturn;
}): ReactElement => {
  const { keyringInfos, onClickNext } = useAccountAddScreenReturn;

  const seedPhraseInfos = useMemo(() => {
    return keyringInfos.map((keyringInfo) => ({
      ...keyringInfo,
      selected: keyringInfo.keyringId === selectedKeyringId,
    }));
  }, [selectedKeyringId, keyringInfos]);

  const disabledButton = useMemo(() => {
    return !selectedKeyringId;
  }, [selectedKeyringId]);

  const select = useCallback((keyringId: string) => {
    if (selectedKeyringId === keyringId) {
      setSelectedKeyringId(undefined);
      return;
    }
    setSelectedKeyringId(keyringId);
  }, []);

  return (
    <StyledContainer>
      <WebTitleWithDescription
        title='Select Seed Phrase'
        description='Select the seed phrase to which you want to add a new account.'
        marginTop={12}
        marginBottom={-6}
      />
      <SelectSeedPhraseBox seedPhrases={seedPhraseInfos} select={select} />
      <WebButton
        figure='primary'
        size='full'
        disabled={disabledButton}
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default SelectSeedPhraseStep;
