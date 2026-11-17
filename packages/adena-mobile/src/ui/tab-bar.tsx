import {StackActions, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

import type {MainStackParams} from '../navigation/types';
import {colorTokens} from './theme';

export type TabName = 'Home' | 'Nft' | 'Explore' | 'History';

const {neutral, primary} = colorTokens;
const IDLE = neutral._4;
// The cut-outs in the search and clock marks take the bar's colour.
const CUT_OUT = neutral._8;

function HomeMark({active}: {active: boolean}) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Path
        d="M16.2519 4.27168C14.9274 3.24147 13.0726 3.24147 11.7481 4.27168L4.91606 9.58546C4.02259 10.2804 3.5 11.3489 3.5 12.4808V20.8324C3.5 22.8582 5.14222 24.5004 7.168 24.5004H10.15C11.1165 24.5004 11.9 23.7169 11.9 22.7504V19.1085C11.9 18.838 11.9472 18.6889 11.9962 18.6105C12.1725 18.3278 12.4079 18.0842 12.6882 17.8973C13.0763 17.6386 13.5328 17.5004 14 17.5004C14.4672 17.5004 14.9237 17.6386 15.3118 17.8973C15.5921 18.0842 15.8275 18.3278 16.0038 18.6105C16.0528 18.6889 16.1 18.838 16.1 19.1085V22.7504C16.1 23.7169 16.8835 24.5004 17.85 24.5004H20.832C22.8578 24.5004 24.5 22.8582 24.5 20.8324V12.4808C24.5 11.3489 23.9774 10.2804 23.0839 9.58546L16.2519 4.27168Z"
        fill={active ? primary._6 : IDLE}
      />
    </Svg>
  );
}

function GalleryMark({active}: {active: boolean}) {
  const accent = active ? primary._6 : IDLE;
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Rect x={2} y={2} width={11} height={11} rx={2} fill={accent} />
      <Rect x={2} y={15} width={11} height={11} rx={2} fill={accent} />
      <Rect
        x={15}
        y={2}
        width={11}
        height={11}
        rx={2}
        fill={active ? neutral._1 : IDLE}
      />
      <Rect x={15} y={15} width={11} height={11} rx={2} fill={accent} />
    </Svg>
  );
}

function SearchMark({active}: {active: boolean}) {
  return (
    <Svg width={23} height={25} viewBox="0 0 23 25" fill="none">
      <Path
        d="M14.7002 16.1548C14.0154 16.716 13.9153 17.7261 14.4765 18.4108L18.6187 23.4646C19.18 24.1493 20.19 24.2495 20.8748 23.6882C21.5595 23.127 21.6597 22.1169 21.0984 21.4322L16.9562 16.3784C16.395 15.6937 15.3849 15.5936 14.7002 16.1548Z"
        fill={active ? primary._6 : IDLE}
      />
      <Path
        d="M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z"
        fill={active ? neutral._1 : IDLE}
      />
      <Path
        d="M10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17Z"
        fill={CUT_OUT}
      />
    </Svg>
  );
}

function ClockMark({active}: {active: boolean}) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Circle cx={14} cy={14} r={12} fill={active ? primary._6 : IDLE} />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 5.25C14.6904 5.25 15.25 5.80964 15.25 6.5V14.0833L18 17.75C18.4142 18.3023 18.3023 19.0858 17.75 19.5C17.1977 19.9142 16.4142 19.8023 16 19.25L12.75 14.9167V6.5C12.75 5.80964 13.3096 5.25 14 5.25Z"
        fill={active ? neutral._1 : CUT_OUT}
      />
    </Svg>
  );
}

const TABS: {
  name: TabName;
  label: string;
  Mark: (props: {active: boolean}) => React.JSX.Element;
}[] = [
  {name: 'Home', label: 'Wallet', Mark: HomeMark},
  {name: 'Nft', label: 'NFTs', Mark: GalleryMark},
  {name: 'Explore', label: 'Explore', Mark: SearchMark},
  {name: 'History', label: 'History', Mark: ClockMark},
];

/**
 * The popup's bottom navigation (router/popup/navigation). A tab replaces the
 * current tab screen, as the extension's `navigate(path, {replace: true})`,
 * so there is never a back step between tabs.
 */
export function TabBar({current}: {current: TabName}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {height: 60 + insets.bottom, paddingBottom: insets.bottom},
      ]}>
      {TABS.map(({name, label, Mark}) => {
        const active = name === current;
        return (
          <Pressable
            key={name}
            testID={`tab-${name}`}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{selected: active}}
            hitSlop={8}
            onPress={() => {
              if (!active) {
                navigation.dispatch(StackActions.replace(name));
              }
            }}
            style={styles.tab}>
            <Mark active={active} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    backgroundColor: neutral._8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
});
