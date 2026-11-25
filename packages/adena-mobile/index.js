import './src/app/polyfills';

import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import App from './src/app/app';
import InjectSheetApp from './src/inject-sheet/inject-sheet-app';

AppRegistry.registerComponent(appName, () => App);
// Android overlay for dApp requests (InjectSheetActivity).
AppRegistry.registerComponent('AdenaInjectSheet', () => InjectSheetApp);
