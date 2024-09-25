import { Row, WebCheckBox, WebText } from '@components/atoms';
import React, { useMemo } from 'react';
import { useTheme } from 'styled-components';
import { StyledSelectSeedPhraseBoxItem } from './select-seed-phrase-box-item.styles';
import { SeedPhraseInfo } from './select-seed-phrase-box.types';

const SelectSeedPhraseBoxItem: React.FC<{
  seedPhrase: SeedPhraseInfo;
  select: (keyringId: string) => void;
}> = ({ seedPhrase, select }) => {
  const theme = useTheme();
  const { index, selected, accountCount, keyringId } = seedPhrase;

  const title = useMemo(() => {
    return `Seed Phrase ${index + 1}`;
  }, [index]);

  const description = useMemo(() => {
    return `(${accountCount} accounts)`;
  }, [accountCount]);

  return (
    <StyledSelectSeedPhraseBoxItem key={index}>
      <Row style={{ columnGap: 8 }}>
        <WebText type='body5'>{title}</WebText>
        <WebText type='body5' color={theme.webNeutral._700}>
          {description}
        </WebText>
      </Row>
      <WebCheckBox checked={selected} onClick={(): void => select(keyringId)} />
    </StyledSelectSeedPhraseBoxItem>
  );
};

export default SelectSeedPhraseBoxItem;
