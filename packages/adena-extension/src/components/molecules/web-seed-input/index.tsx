import React, { ReactElement, useCallback, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import _ from 'lodash';

import IconAlert from '@assets/web/alert-circle.svg';

import { Pressable, Row, View, WebImg, WebInput, WebText } from '../../atoms';
import mixins from '@styles/mixins';
import { getTheme, webFonts } from '@styles/theme';

export type WebSeedInputType = '12seeds' | '24seeds' | 'pKey';

interface WebSeedInputProps {
  onChange: (props: { type: WebSeedInputType; value: string }) => void;
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

const StyledItem = styled(Row) <{ error: boolean }>`
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid
    ${({ error, theme }): string => (error ? theme.webError._200 : theme.webNeutral._800)};
  box-shadow: ${({ error }): string =>
    error
      ? '0px 0px 0px 3px rgba(235, 84, 94, 0.12), 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);'
      : ''};
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

const StyledTypeMenuItem = styled(Pressable) <{ selected: boolean }>`
  padding: 8px 12px;
  border-radius: 40px;
  background: ${({ selected }): string => (selected ? 'rgba(0, 89, 255, 0.24)' : 'transparent')};
`;

const StyledNoText = styled(WebText) <{ error: boolean }>`
  ${mixins.flex()}
  background: ${({ error, theme }): string => (error ? '#E0517014' : theme.webInput._100)};
  border-right: 1px solid
    ${({ error, theme }): string => (error ? theme.webError._200 : theme.webNeutral._800)};
  width: 40px;
  height: 100%;
  align-items: center;
`;

const StyledInput = styled(WebInput) <{ error: boolean }>`
  flex: 1;
  width: 100%;
  height: 40px;
  border-radius: 0;
  border: none;
  outline: none;
  background: ${({ error, theme }): string => (error ? theme.webError._300 : theme.webNeutral._900)};
  box-shadow: none;

  :focus-visible {
    background:${({ error, theme }): string => (error ? theme.webError._300 : theme.webNeutral._900)};
  }
`;

const StyledTextarea = styled.textarea <{ error: boolean }>`
  ${webFonts.body5};
  color: ${getTheme('webNeutral', '_0')};
  padding: 16px;
  flex: 1;
  width: 100%;
  height: 80px;
  border-radius: 0;
  border: none;
  outline: none;
  background: ${({ error, theme }): string => (error ? theme.webError._300 : theme.webNeutral._900)};
  resize: none;

  :focus-visible {
    background: ${({ error, theme }): string => (error ? theme.webError._300 : theme.webNeutral._900)};
  }
`;

export const WebSeedInput = ({ errorMessage, onChange }: WebSeedInputProps): ReactElement => {
  const theme = useTheme();

  const [type, setType] = useState<WebSeedInputType>('12seeds');
  const [wordList, setWordList] = useState<string[]>([]);
  const [pKey, setPKey] = useState('');

  const _getFilledWordList = useCallback(
    (_type: WebSeedInputType, _wordList: string[]): string[] => {
      const targetLength = _type === '12seeds' ? 12 : 24;
      const filledArray = _.fill(Array(targetLength), '');
      return [..._wordList].concat(filledArray.slice(_wordList.length)).slice(0, targetLength);
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

  const TypeMenuItem = useCallback(
    ({ title, _type }: { title: string; _type: WebSeedInputType }): ReactElement => {
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
          <StyledItem error={!!errorMessage}>
            <StyledTextarea
              value={pKey}
              placeholder='Private Key'
              error={!!errorMessage}
              onChange={({ target: { value } }): void => {
                onChange({ type, value });
                setPKey(value);
              }}
            />
          </StyledItem>
        ) : (
          <StyledInputBox>
            {_.times(type === '12seeds' ? 12 : 24, (index) => {
              return (
                <StyledItem key={`seeds-${index}`} error={!!errorMessage}>
                  <StyledNoText
                    type='body4'
                    color={errorMessage ? theme.webError._100 : theme.webNeutral._500}
                    error={!!errorMessage}
                  >
                    {index + 1}
                  </StyledNoText>
                  <StyledInput
                    type='password'
                    value={wordList[index] || ''}
                    onChange={({ target: { value } }): void => {
                      if (index === 0 && value.split(' ').length > 1) {
                        setWordList(value.split(' '));
                        onChange({ type, value });
                      } else {
                        onChangeWord(index, value);
                      }
                    }}
                    error={!!errorMessage}
                  />
                </StyledItem>
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
