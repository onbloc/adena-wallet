/**
 * @format
 */

// Must stay the first import: installs crypto.getRandomValues and Buffer.
import './src/platform/polyfills';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
