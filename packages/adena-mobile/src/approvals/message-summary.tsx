import React from 'react';
import {StyleSheet, Text} from 'react-native';

import {formatGnot} from '../core/format';
import {Address} from '../ui/address';
import {Body, Card, Row} from '../ui/components';
import {colors} from '../ui/theme';

const ugnot = (coins: string | undefined): string => {
  if (!coins) {
    return '-';
  }
  const match = /^(\d+)ugnot$/.exec(coins.trim());
  return match ? formatGnot(match[1]) : coins;
};

/**
 * Human-readable view of one Gno message, built from the document that will be
 * signed. Unknown types are shown as raw JSON instead of being summarized.
 */
export function MessageSummary({
  message,
  index,
}: {
  message: any;
  index: number;
}) {
  const value = message?.value ?? {};
  switch (message?.type) {
    case '/bank.MsgSend':
      return (
        <Card>
          <Body>#{index + 1} Send GNOT</Body>
          <Row label="Amount" value={ugnot(value.amount)} />
          <Body muted>To</Body>
          <Address value={String(value.to_address ?? '')} />
        </Card>
      );
    case '/vm.m_call':
      return (
        <Card>
          <Body>#{index + 1} Call realm</Body>
          <Row label="Realm" value={String(value.pkg_path ?? '')} />
          <Row label="Function" value={String(value.func ?? '')} />
          <Row label="Arguments" value={JSON.stringify(value.args ?? [])} />
          <Row label="Sends" value={ugnot(value.send)} />
        </Card>
      );
    case '/vm.m_addpkg':
    case '/vm.m_run': {
      const pkg = value.package ?? {};
      return (
        <Card>
          <Body>
            #{index + 1}{' '}
            {message.type === '/vm.m_run' ? 'Run code' : 'Deploy package'}
          </Body>
          <Row label="Package" value={String(pkg.path ?? pkg.Path ?? '')} />
          <Row
            label="Files"
            value={String((pkg.files ?? pkg.Files ?? []).length)}
          />
          {message.type === '/vm.m_run' && (
            <Row label="Sends" value={ugnot(value.send)} />
          )}
        </Card>
      );
    }
    default:
      return (
        <Card>
          <Body>
            #{index + 1} {String(message?.type ?? 'Unknown message')}
          </Body>
          <Text selectable style={styles.raw}>
            {JSON.stringify(value, null, 2)}
          </Text>
        </Card>
      );
  }
}

const styles = StyleSheet.create({
  raw: {fontFamily: 'Menlo', fontSize: 12, color: colors.text},
});
