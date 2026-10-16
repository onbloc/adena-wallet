import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useLayoutEffect, useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text} from 'react-native';

import {
  applyNetworkEdit,
  checkRpcChainId,
  makeCustomNetwork,
  NetworkInput,
  NetworkInputErrors,
  removeNetwork,
  rpcCheckMessage,
  trimTrailingSlash,
  validateNetworkInput,
} from '../../core/custom-network';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {ButtonPair, ErrorText, Field, Notice, Screen} from '../../ui/components';
import {colors, fonts} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'NetworkEdit'>;

const stripSpaces = (text: string) => text.replace(/ /g, '');

/**
 * The popup's add / edit custom network screen (Gno). A default network keeps
 * its name and chain ID; only its URLs change, and "Reset to Default" brings
 * the bundled values back.
 */
export function NetworkEditScreen({navigation, route}: Props) {
  const {base, networks, saveNetworks} = useWallet();
  const origin = useMemo(
    () => networks.find(item => item.id === route.params?.id) ?? null,
    [networks, route.params?.id],
  );
  const isDefault = !!origin?.default;
  const [input, setInput] = useState<NetworkInput>(() => ({
    name: origin?.networkName ?? '',
    rpcUrl: origin?.rpcUrl ?? '',
    chainId: origin?.chainId ?? '',
    indexerUrl: origin?.indexerUrl ?? '',
  }));
  const [errors, setErrors] = useState<NetworkInputErrors>({});
  const [checkError, setCheckError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: origin ? 'Edit Network' : 'Add Custom Network',
    });
  }, [navigation, origin]);

  const change = (field: keyof NetworkInput) => (text: string) => {
    setInput(prev => ({
      ...prev,
      [field]: field === 'name' ? text : stripSpaces(text),
    }));
    setErrors(prev => ({...prev, [field]: undefined}));
    setCheckError(null);
  };

  const changed =
    !origin ||
    origin.networkName !== input.name ||
    origin.rpcUrl !== input.rpcUrl ||
    origin.chainId !== input.chainId ||
    (origin.indexerUrl ?? '') !== input.indexerUrl;
  const filled = input.name.trim() !== '' && !!input.rpcUrl && !!input.chainId;

  const save = async () => {
    const found = validateNetworkInput(input, networks, origin?.id);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      return;
    }
    setSaving(true);
    try {
      // Only when the endpoint or chain changes: a rename needs no round trip.
      const endpointChanged =
        !origin ||
        trimTrailingSlash(origin.rpcUrl) !== trimTrailingSlash(input.rpcUrl) ||
        origin.chainId !== input.chainId;
      if (endpointChanged) {
        const message = rpcCheckMessage(
          await checkRpcChainId(input.rpcUrl, input.chainId),
        );
        if (message) {
          setCheckError(message);
          return;
        }
      }
      const next = origin
        ? networks.map(item =>
            item.id === origin.id ? applyNetworkEdit(origin, input) : item,
          )
        : [...networks, makeCustomNetwork(input)];
      await saveNetworks(next);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const clear = () => {
    if (!origin) {
      return;
    }
    const title = isDefault ? 'Reset to Default' : 'Remove Network';
    Alert.alert(title, `${title}: ${origin.networkName}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: isDefault ? 'Reset' : 'Remove',
        style: 'destructive',
        onPress: async () => {
          const bundledList = await base.chainService
            .fetchDefaultNetworks()
            .catch(() => []);
          if (isDefault) {
            const bundled = bundledList.find(item => item.id === origin.id);
            if (bundled) {
              await saveNetworks(
                networks.map(item => (item.id === origin.id ? bundled : item)),
              );
            }
          } else {
            await saveNetworks(
              removeNetwork(
                networks,
                origin.id,
                new Set(bundledList.map(item => item.id)),
              ),
            );
          }
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: () => navigation.goBack()}}
          confirm={{
            title: 'Save',
            testID: 'network-save',
            disabled: !filled || !changed,
            loading: saving,
            onPress: save,
          }}
        />
      }>
      <Text style={styles.group}>Gno.land</Text>
      <Field
        label="Network Name"
        hideLabel
        placeholder="Network Name"
        value={input.name}
        editable={!isDefault}
        error={!!errors.name}
        onChangeText={change('name')}
      />
      <ErrorText>{errors.name}</ErrorText>
      <Field
        label="RPC URL"
        hideLabel
        placeholder="RPC URL"
        value={input.rpcUrl}
        keyboardType="url"
        error={!!errors.rpcUrl}
        onChangeText={change('rpcUrl')}
      />
      <ErrorText>{errors.rpcUrl}</ErrorText>
      <Field
        label="Chain ID"
        hideLabel
        placeholder="Chain ID"
        value={input.chainId}
        editable={!isDefault}
        error={!!errors.chainId}
        onChangeText={change('chainId')}
      />
      <ErrorText>{errors.chainId}</ErrorText>
      <Field
        label="Indexer URL (Optional)"
        hideLabel
        placeholder="Indexer URL (Optional)"
        value={input.indexerUrl}
        keyboardType="url"
        error={!!errors.indexerUrl}
        onChangeText={change('indexerUrl')}
      />
      <ErrorText>{errors.indexerUrl}</ErrorText>
      {checkError && <Notice tone="danger">{checkError}</Notice>}
      <Notice>
        A network you add sees your address and every transaction you send
        through it. Only add an RPC you trust.
      </Notice>
      {origin && (
        <Pressable
          accessibilityRole="button"
          onPress={clear}
          style={styles.clear}>
          <Text style={styles.clearText}>
            {isDefault ? 'Reset to Default' : 'Remove Network'}
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {...fonts.body2Bold, color: colors.textMuted},
  clear: {alignSelf: 'center', marginTop: 16, padding: 4},
  clearText: {
    ...fonts.body1Reg,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
