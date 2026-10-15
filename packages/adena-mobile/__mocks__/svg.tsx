import React from 'react';
import {View} from 'react-native';

// Jest stand-in for react-native-svg-transformer: an empty view per icon.
const SvgMock = (props: object) => <View {...props} />;

export default SvgMock;
