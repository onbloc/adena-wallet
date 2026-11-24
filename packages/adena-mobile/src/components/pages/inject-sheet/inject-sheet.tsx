import React, { ReactElement, RefObject, useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, ScrollView, TextInputInstance, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../../theme';
import { Button, Skeleton, Text } from '../../atoms';
import { InlineAlert, KeyValueRow, TextField } from '../../molecules';
import { DappMessageList, DappMessageView, DappRequester } from '../dapp-request';
import { styles } from './inject-sheet.styles';

export const SheetAuthMode = {
  BIOMETRIC: 'biometric',
  PASSWORD: 'password',
} as const;

export type SheetAuthMode = (typeof SheetAuthMode)[keyof typeof SheetAuthMode];

export interface InjectSheetAuthView {
  mode: SheetAuthMode;
  biometricLabel?: string;
  password: string;
  onChangePassword: (value: string) => void;
  // Switches between biometrics and the password (offered when biometrics are enabled).
  onUsePassword?: () => void;
  onUseBiometrics?: () => void;
  // Why biometrics fell back to the password, shown on the field.
  passwordError?: string;
  passwordRef?: RefObject<TextInputInstance | null>;
}

export interface InjectSheetPageProps {
  title: string;
  dappName?: string;
  origin?: string;
  callerPackage?: string;
  rows: { label: string; value: string; multiline?: boolean }[];
  messages: DappMessageView[];
  fee?: string;
  feeWarning?: string;
  memo?: string;
  expandedCode?: string[];
  onToggleCode?: (id: string) => void;
  codeReviewPending?: boolean;
  loading: boolean;
  error?: string;
  // Blocking state (invalid link, no wallet): only a close action is offered.
  unavailable?: { title: string; description: string };
  auth?: InjectSheetAuthView;
  approveLabel: string;
  approving: boolean;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
}

// The activity is edge-to-edge, so adjustResize does not shrink it; the sheet pads itself above the IME.
const useKeyboardHeight = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const update = (next: number): void => {
      LayoutAnimation.configureNext(LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
      setHeight(next);
    };
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', event => update(event.endCoordinates.height)),
      Keyboard.addListener('keyboardDidHide', () => update(0)),
    ];

    return (): void => subscriptions.forEach(subscription => subscription.remove());
  }, []);

  return height;
};

// Bottom sheet drawn by the translucent Android activity on top of the calling dApp.
export const InjectSheetPage = (props: InjectSheetPageProps): ReactElement => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const bottomPadding = keyboardHeight > 0 ? keyboardHeight + insets.bottom + spacing.space16 : Math.max(insets.bottom, spacing.space24);

  // Return approves like the button, only when approval is possible.
  const handleSubmitPassword = (): void => {
    if (props.canApprove && !props.approving) {
      props.onApprove();
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.scrim} />
      <View style={[styles.sheet, { paddingBottom: bottomPadding }]} accessibilityViewIsModal>
        <View style={styles.handle} />
        <Text variant='title'>{props.unavailable?.title ?? props.title}</Text>
        {props.unavailable
          ? (
              <>
                <Text variant='body' color='secondary'>{props.unavailable.description}</Text>
                <Button label='Close' tone='secondary' onPress={props.onReject} />
              </>
            )
          : (
              <>
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps='handled'>
                  <DappRequester style={styles.origin} dappName={props.dappName} origin={props.origin} callerPackage={props.callerPackage} />
                  {props.rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} multiline={row.multiline} />)}
                  {props.loading && <Skeleton height={96} />}
                  <DappMessageList
                    messages={props.messages}
                    expandedCode={props.expandedCode}
                    onToggleCode={props.onToggleCode}
                    codeReviewPending={props.codeReviewPending}
                  />
                  {props.memo ? <KeyValueRow label='Memo' value={props.memo} multiline /> : null}
                  {props.fee && <KeyValueRow label='Network fee' value={props.fee} emphasis />}
                  {props.feeWarning && <InlineAlert tone='warning' title='High network fee' description={props.feeWarning} />}
                  {props.auth?.mode === SheetAuthMode.PASSWORD && (
                    <TextField
                      ref={props.auth.passwordRef}
                      label='Wallet password'
                      value={props.auth.password}
                      onChangeText={props.auth.onChangePassword}
                      placeholder='Password'
                      secure
                      returnKeyType='go'
                      submitBehavior='submit'
                      onSubmitEditing={handleSubmitPassword}
                      error={props.auth.passwordError}
                      testID='inject-sheet-password'
                    />
                  )}
                  {props.auth?.mode === SheetAuthMode.BIOMETRIC && props.auth.biometricLabel && (
                    <Text variant='meta' color='secondary' testID='inject-sheet-auth-hint'>{`You will confirm with ${props.auth.biometricLabel}.`}</Text>
                  )}
                  {props.auth?.mode === SheetAuthMode.BIOMETRIC && props.auth.onUsePassword && (
                    <Button label='Use password' tone='tertiary' size='compact' onPress={props.auth.onUsePassword} testID='inject-sheet-use-password' />
                  )}
                  {props.auth?.mode === SheetAuthMode.PASSWORD && props.auth.onUseBiometrics && (
                    <Button
                      label={`Use ${props.auth.biometricLabel ?? 'biometrics'}`}
                      tone='tertiary'
                      size='compact'
                      onPress={props.auth.onUseBiometrics}
                      testID='inject-sheet-use-biometrics'
                    />
                  )}
                  {props.error && <InlineAlert tone='error' title='This request cannot be completed' description={props.error} />}
                </ScrollView>
                <View style={styles.actions}>
                  <Button label='Reject' tone='secondary' style={styles.action} disabled={props.approving} onPress={props.onReject} />
                  <Button
                    // The auth method stays out of the label so it never truncates; the hint and icon show it.
                    label={props.approveLabel}
                    style={styles.action}
                    leadingIcon={props.auth?.mode === SheetAuthMode.BIOMETRIC ? 'fingerprint' : undefined}
                    disabled={!props.canApprove}
                    loading={props.approving}
                    onPress={props.onApprove}
                    testID='inject-sheet-approve'
                  />
                </View>
              </>
            )}
      </View>
    </View>
  );
};
