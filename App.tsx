import { StatusBar } from 'expo-status-bar';

import PlaygroundScreen from './src/ui/PlaygroundScreen';

export default function App() {
  return (
    <>
      <PlaygroundScreen />
      <StatusBar style="auto" />
    </>
  );
}
