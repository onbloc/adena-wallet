import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {getCryptoProvider, toBase64UrlNoPadding} from 'adena-module';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import WebView, {
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview';
import type {ShouldStartLoadRequest} from 'react-native-webview/lib/WebViewTypes';

import type {MainStackParams} from '../navigation/types';
import {colors, fonts, inputFont, radius, spacing} from '../ui/theme';
import {bridgeScript} from './bridge';
import {routeToWallet} from './dapp-router';
import {parsePageMessage} from './page-message';
import providerBundle from './provider/generated/provider-bundle';
import {displayHost, isAllowedOrigin, originOf} from './url-origin';

type Props = NativeStackScreenProps<MainStackParams, 'Browser'>;

const HOME_URL = 'https://gno.land';

/** A typed address: https:// is assumed when no scheme is given. */
export function normalizeInput(input: string): string {
  const trimmed = input.trim();
  return /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function BrowserScreen({route, navigation}: Props) {
  const webView = useRef<WebView>(null);
  const navUrl = useRef('');
  const navOrigin = useRef<string | null>(null);
  const [source, setSource] = useState(route.params?.url ?? HOME_URL);
  const [address, setAddress] = useState(source);
  const [host, setHost] = useState('');
  const [blocked, setBlocked] = useState('');

  // One token per browser screen; see bridge.ts.
  const token = useMemo(
    () => toBase64UrlNoPadding(getCryptoProvider().randomBytes(24)),
    [],
  );
  const injected = useMemo(
    () => `${bridgeScript(token)}\n${providerBundle}\ntrue;`,
    [token],
  );

  const track = useCallback((url: string) => {
    navUrl.current = url;
    navOrigin.current = originOf(url);
    setAddress(url);
    setHost(navOrigin.current ? displayHost(navOrigin.current) : '');
  }, []);

  const onShouldStartLoad = useCallback((request: ShouldStartLoadRequest) => {
    if (request.url === 'about:blank') {
      return true;
    }
    const origin = originOf(request.url);
    if (request.isTopFrame === false) {
      // Frames may load web content but never get the provider.
      return origin !== null;
    }
    if (!isAllowedOrigin(origin)) {
      setBlocked(
        `Blocked: only https pages can be opened (${request.url.slice(
          0,
          60,
        )}).`,
      );
      return false;
    }
    setBlocked('');
    return true;
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const origin = navOrigin.current;
      // The event's own URL must agree with the navigation we tracked.
      if (!origin || originOf(event.nativeEvent.url) !== origin) {
        return;
      }
      const parsed = parsePageMessage({
        raw: event.nativeEvent.data,
        nativeOrigin: origin,
        nativeUrl: navUrl.current,
        token,
      });
      if (!parsed.accepted) {
        return;
      }
      routeToWallet(parsed.message, navUrl.current, origin, response => {
        // The page that asked may have navigated away; never answer another origin.
        if (navOrigin.current !== origin) {
          return;
        }
        const payload = JSON.stringify(JSON.stringify(response));
        webView.current?.injectJavaScript(
          `window.__adenaNativeDeliver(${payload});true;`,
        );
      });
    },
    [token],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.toolButton}>
          <Text style={styles.toolText}>Close</Text>
        </Pressable>
        <TextInput
          style={styles.address}
          value={address}
          onChangeText={setAddress}
          onSubmitEditing={() => setSource(normalizeInput(address))}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          selectTextOnFocus
          keyboardAppearance="dark"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => webView.current?.goBack()}
          style={styles.toolButton}>
          <Text style={styles.toolText}>Back</Text>
        </Pressable>
      </View>
      {!!host && <Text style={styles.host}>{host}</Text>}
      {!!blocked && <Text style={styles.blocked}>{blocked}</Text>}
      <WebView
        ref={webView}
        source={{uri: source}}
        injectedJavaScriptBeforeContentLoaded={injected}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        injectedJavaScriptForMainFrameOnly
        onLoadStart={event => track(event.nativeEvent.url)}
        onNavigationStateChange={(state: WebViewNavigation) => track(state.url)}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        onMessage={onMessage}
        originWhitelist={[
          'https://*',
          'http://localhost*',
          'http://127.0.0.1*',
          'about:blank',
        ]}
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        webviewDebuggingEnabled={__DEV__}
        allowsLinkPreview={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolButton: {paddingHorizontal: spacing.xs, paddingVertical: spacing.xs},
  toolText: {...fonts.body2Bold, color: colors.text},
  address: {
    ...inputFont(fonts.body2Reg),
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    color: colors.text,
  },
  host: {
    ...fonts.captionReg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.textMuted,
  },
  blocked: {
    ...fonts.captionReg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    color: colors.danger,
  },
});
