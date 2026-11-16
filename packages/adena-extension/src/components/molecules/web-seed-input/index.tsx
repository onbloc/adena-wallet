import _ from 'lodash';
import { ReactElement, useCallback, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-circle.svg';
import { WebSeedInputItem } from '@components/atoms/web-seed-input-item';
import { WebTextarea } from '@components/atoms/web-textarea';
import { webFonts } from '@styles/theme';
import { ImportWalletType } from '@types';

import { Pressable, Row, View, WebImg, WebText } from '../../atoms';
import { makeFilledSeedPhrase } from './web-seed-input.utils';

interface WebSeedInputProps {
  onChange: (props: { type: ImportWalletType; value: string }) => void;
  errorMessage?: string;
}

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 16px;
`;

const StyledInputBox = styled(View)`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const StyledTypeMenu = styled(Row)`
  align-self: center;
  padding: 4px;
  column-gap: 4px;
  justify-content: center;
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(0, 0, 0, 0.2);
`;

const StyledTypeMenuItem = styled(Pressable)<{ selected: boolean }>`
  padding: 8px 12px;
  border-radius: 40px;
  background: ${({ selected }): string => (selected ? 'rgba(0, 89, 255, 0.24)' : 'transparent')};
`;

const StyledTextarea = styled(WebTextarea)`
  ${webFonts.body5};
  width: 100%;
  height: 80px;
`;

export const WebSeedInput = ({ errorMessage, onChange }: WebSeedInputProps): ReactElement => {
  const theme = useTheme();

  const [type, setType] = useState<ImportWalletType>('12seeds');
  const [wordList, setWordList] = useState<string[]>([]);
  const [pKey, setPKey] = useState('');

  const _getFilledWordList = useCallback(
    (_type: ImportWalletType, _wordList: string[]): string[] => {
      const length = _type === '12seeds' ? 12 : 24;
      return makeFilledSeedPhrase(_wordList, length);
    },
    [],
  );

  const onChangeWord = useCallback(
    (index: number, value: string) => {
      const list = _getFilledWordList(type, wordList);
      list[index] = value;

      setWordList(list);
      onChange({ type, value: list.join(' ') });
    },
    [type, wordList],
  );

  const onChangeWebSeedInputByWords = useCallback(
    (value: string) => {
      const words = _getFilledWordList(type, value.split(' '));
      setWordList(words);
      onChange({ type, value: words.join(' ') });
    },
    [type],
  );

  const TypeMenuItem = useCallback(
    ({ title, _type }: { title: string; _type: ImportWalletType }): ReactElement => {
      const selected = type === _type;
      return (
        <StyledTypeMenuItem
          onClick={(): void => {
            setType(_type);
            const value = _type === 'pKey' ? pKey : _getFilledWordList(_type, wordList).join(' ');
            onChange({ type: _type, value });
          }}
          selected={selected}
        >
          <WebText type='title5' color={selected ? theme.webNeutral._100 : theme.webNeutral._500}>
            {title}
          </WebText>
        </StyledTypeMenuItem>
      );
    },
    [type, wordList, pKey],
  );

  return (
    <StyledContainer>
      <StyledTypeMenu>
        <TypeMenuItem _type='12seeds' title='12 words' />
        <TypeMenuItem _type='24seeds' title='24 words' />
        <TypeMenuItem _type='pKey' title='Private Key' />
      </StyledTypeMenu>

      <View style={{ rowGap: 12 }}>
        {type === 'pKey' ? (
          <StyledTextarea
            value={pKey}
            placeholder='Private Key'
            error={!!errorMessage}
            onChange={({ target: { value } }): void => {
              onChange({ type, value });
              setPKey(value);
            }}
          />
        ) : (
          <StyledInputBox>
            {_.times(type === '12seeds' ? 12 : 24, (index) => {
              return (
                <WebSeedInputItem
                  type='password'
                  key={`seeds-${index}`}
                  index={index + 1}
                  value={wordList[index] || ''}
                  error={!!errorMessage}
                  onChange={(value: string): void => {
                    if (index === 0 && value.split(' ').length > 1) {
                      onChangeWebSeedInputByWords(value);
                    } else {
                      onChangeWord(index, value);
                    }
                  }}
                />
              );
            })}
          </StyledInputBox>
        )}
        {!!errorMessage && (
          <Row style={{ columnGap: 6, alignItems: 'center' }}>
            <WebImg src={IconAlert} size={20} color={theme.webError._100} />
            <WebText type='body5' color={theme.webError._100}>
              {errorMessage}
            </WebText>
          </Row>
        )}
      </View>
    </StyledContainer>
  );
};
