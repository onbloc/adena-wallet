import styled, { useTheme } from 'styled-components';

import { DefaultInput, ErrorText, Text } from '@components/atoms';
import { CancelAndConfirmButton } from '@components/molecules';
import { useAutoLockTimer } from '@hooks/certify/use-auto-lock-timer';
import { MAX_AUTO_LOCK_TIMEOUT_MINUTES } from '@repositories/wallet';
import mixins from '@styles/mixins';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

const Description = styled(Text)`
  margin-top: 12px;
`;

const FormBox = styled.div`
  width: 100%;
  margin-top: 24px;
  margin-bottom: auto;

  & > * {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const InputRow = styled.div`
  position: relative;
  width: 100%;
`;

// Reserve enough right padding for the "Minutes" suffix so the typed value
// never overlaps the label.
const MinutesInput = styled(DefaultInput)`
  padding-right: 80px;
`;

const MinutesSuffix = styled.span`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 400;
  font-size: 14px;
  line-height: 21px;
  color: ${({ theme }): string => theme.neutral._1};
  pointer-events: none;
`;

const DisabledNotice = styled(Text)`
  margin-top: 8px;
`;

export const AutoLockTimer = (): JSX.Element => {
  const theme = useTheme();
  const { value, onChange, errorMessage, saveDisabled, onSave, onCancel } = useAutoLockTimer();

  const showDisabledNotice = !errorMessage && value === '0';

  return (
    <Wrapper>
      <Text type='header4'>Auto-Lock Timer</Text>
      <Description type='body2Reg' color={theme.neutral.a}>
        Set a time it takes Adena to automatically lock your wallet. Use 0 to disable auto-lock.
      </Description>
      <FormBox>
        <InputRow>
          <MinutesInput
            type='text'
            inputMode='numeric'
            pattern='[0-9]*'
            name='autoLockMinutes'
            value={value}
            onChange={onChange}
            // Defensive against keys that some browsers still surface even on
            // type=text: arrow up/down (no-op on single-line, but matches the
            // BalanceInput pattern), and characters we never want regardless
            // of paste/IME behavior.
            onKeyDown={(event): void => {
              if (
                event.key === '-' ||
                event.key === '.' ||
                event.key === 'e' ||
                event.key === 'E' ||
                event.key === 'ArrowUp' ||
                event.key === 'ArrowDown'
              ) {
                event.preventDefault();
              }
            }}
            // Wheel scrolling on a focused number input nudges the value in
            // some browsers; blurring on wheel matches BalanceInput.
            onWheel={(event): void => event.currentTarget.blur()}
            error={Boolean(errorMessage)}
            maxLength={String(MAX_AUTO_LOCK_TIMEOUT_MINUTES).length}
            autoComplete='off'
          />
          <MinutesSuffix>Minutes</MinutesSuffix>
        </InputRow>
        {Boolean(errorMessage) && <ErrorText text={errorMessage} />}
        {showDisabledNotice && (
          <DisabledNotice type='body2Reg' color={theme.red._4}>
            Auto-lock is disabled. The wallet will stay unlocked until you lock it manually or
            close the browser.
          </DisabledNotice>
        )}
      </FormBox>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: onCancel }}
        confirmButtonProps={{
          onClick: onSave,
          text: 'Save',
          props: { disabled: saveDisabled },
        }}
      />
    </Wrapper>
  );
};
