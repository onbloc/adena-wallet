import { StatusBar } from 'expo-status-bar';

import PlaygroundScreen from './src/mock/app/PlaygroundScreen';

export default function App() {
  return (
    <>
      <PlaygroundScreen />
      <StatusBar style="auto" />
    </>
  );
}
