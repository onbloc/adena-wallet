import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

// Height of the software keyboard, updated as it starts to show or hide (0 while hidden).
export const useKeyboardHeight = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const subscriptions = [
      Keyboard.addListener('keyboardWillShow', event => setHeight(event.endCoordinates.height)),
      Keyboard.addListener('keyboardWillHide', () => setHeight(0)),
    ];

    return (): void => subscriptions.forEach(subscription => subscription.remove());
  }, []);

  return height;
};
