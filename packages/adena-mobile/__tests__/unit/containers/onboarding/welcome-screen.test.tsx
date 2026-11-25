import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { Pressable, Text } from 'react-native';

import { WelcomeScreen } from '../../../../src/containers/onboarding/welcome-screen';
import { OnboardingStackParamList } from '../../../../src/navigation/types';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { createWrapper } from '../../../helpers/query-wrapper';
import { TEST_MNEMONIC } from '../../../helpers/test-container';
import { wrapPage } from '../../components/pages/render-page';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const BackupStub = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'BackupPhrase'>): ReactElement => {
  const handleBack = (): void => navigation.goBack();

  return <Pressable accessibilityRole='button' onPress={handleBack}><Text>Back to welcome</Text></Pressable>;
};

describe('WelcomeScreen', () => {
  it('drops the generated phrase when the user backs out to the start', async () => {
    const { Wrapper } = createWrapper({ walletService: { generateMnemonic: () => TEST_MNEMONIC } });

    await render(wrapPage(
      <Wrapper>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name='Welcome' component={WelcomeScreen} />
            <Stack.Screen name='BackupPhrase' component={BackupStub} />
          </Stack.Navigator>
        </NavigationContainer>
      </Wrapper>,
    ));

    await fireEvent.press(screen.getByTestId('welcome-create'));
    expect(useOnboardingStore.getState().mnemonic).toBe(TEST_MNEMONIC);

    await fireEvent.press(await screen.findByRole('button', { name: 'Back to welcome' }));
    await act(async () => undefined);
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
  });
});
