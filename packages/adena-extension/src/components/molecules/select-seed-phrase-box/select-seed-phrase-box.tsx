import {
  WebText,
} from '@components/atoms';
import React from 'react';

import {
  StyledSelectSeedPhraseBox,
  StyledSelectSeedPhraseContent,
} from './select-seed-phrase-box.styles';
import {
  SeedPhraseInfo,
} from './select-seed-phrase-box.types';
import SelectSeedPhraseBoxItem from './select-seed-phrase-box-item';

export interface SelectSeedPhraseBoxProps {
  seedPhrases: SeedPhraseInfo[];
  select: (keyringId: string) => void;
}

const SelectSeedPhraseBox: React.FC<SelectSeedPhraseBoxProps> = ({
  seedPhrases, select,
}) => {
  const hasSeedPhrase = seedPhrases.length > 0;

  return (
    <StyledSelectSeedPhraseBox>
      <StyledSelectSeedPhraseContent>
        {hasSeedPhrase
          ? (
              seedPhrases.map((seedPhrase, index) => (
                <SelectSeedPhraseBoxItem key={index} seedPhrase={seedPhrase} select={select} />
              ))
            )
          : (
              <WebText type='body4'>No data to display</WebText>
            )}
      </StyledSelectSeedPhraseContent>
    </StyledSelectSeedPhraseBox>
  );
};

export default SelectSeedPhraseBox;
