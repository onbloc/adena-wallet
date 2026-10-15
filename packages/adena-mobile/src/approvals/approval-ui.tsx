/**
 * Pieces shared by the approval screens, after the extension's approve-*
 * pages: centred title, domain pill, permission table, message cards with
 * key/value rows, info pills and the raw-data toggle.
 */
import ArrowDown from '@assets/arrowS-down-gray.svg';
import ArrowUp from '@assets/arrowS-up-gray.svg';
import CheckCircle from '@assets/check-circle.svg';
import FaviconDefault from '@assets/favicon-default-small.svg';
import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {displayHost} from '../browser/url-origin';
import {colors, colorTokens, fonts, monoFont} from '../ui/theme';

const {neutral} = colorTokens;

export function ApprovalTitle({children}: {children: string}) {
  return (
    <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
      {children}
    </Text>
  );
}

/**
 * The requesting site. The registrable host is in bold and the full origin
 * below it, so a look-alike subdomain cannot hide behind a familiar name.
 */
export function DomainBox({origin}: {origin: string}) {
  return (
    <View style={styles.domain}>
      <FaviconDefault width={20} height={20} />
      <View style={styles.domainText}>
        <Text style={styles.domainHost} numberOfLines={1}>
          {displayHost(origin)}
        </Text>
        <Text selectable style={styles.domainOrigin}>
          {origin}
        </Text>
      </View>
    </View>
  );
}

export function PermissionTable({items}: {items: string[]}) {
  return (
    <View style={styles.table}>
      <Text style={styles.tableHeader}>Allow this site to:</Text>
      <View style={styles.tableBody}>
        {items.map(item => (
          <View key={item} style={styles.permission}>
            <CheckCircle width={16} height={16} />
            <Text style={styles.permissionText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** "{n}. {title}" card with key/value rows (approve-transaction-message). */
export function MessageCard({
  title,
  children,
}: React.PropsWithChildren<{title: string}>) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.map((row, index) => (
        <View
          key={index}
          style={[styles.cardRow, index > 0 && styles.cardDivider]}>
          {row}
        </View>
      ))}
    </View>
  );
}

export function KeyValue({
  label,
  value,
  stacked,
}: {
  label: string;
  value: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <View style={[styles.kv, stacked && styles.kvStacked]}>
      <Text style={styles.kvLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text selectable style={[styles.kvValue, stacked && styles.kvLeft]}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Pill row such as "Network Fee" or "Signing with". */
export function InfoPill({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.pill}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text selectable style={styles.kvValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** "View Transaction Data" toggle with the raw JSON underneath. */
export function RawData({json}: {json: unknown}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.raw}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(value => !value)}
        style={styles.rawToggle}>
        <Text style={styles.rawToggleText}>
          {open ? 'Hide Transaction Data' : 'View Transaction Data'}
        </Text>
        {open ? (
          <ArrowUp width={16} height={16} />
        ) : (
          <ArrowDown width={16} height={16} />
        )}
      </Pressable>
      {open && (
        <ScrollView style={styles.rawBox} nestedScrollEnabled>
          <Text selectable style={styles.rawText}>
            {JSON.stringify(json, null, 2)}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...fonts.header4,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  domain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 41,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: neutral._9,
  },
  domainText: {flex: 1},
  domainHost: {...fonts.body2Bold, color: colors.text},
  domainOrigin: {...fonts.captionReg, color: colors.textMuted},
  table: {borderRadius: 18, backgroundColor: neutral._9},
  tableHeader: {
    ...fonts.body2Bold,
    color: colors.textMuted,
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: neutral._8,
  },
  tableBody: {padding: 12, gap: 8},
  permission: {flexDirection: 'row', alignItems: 'center', gap: 8},
  permissionText: {...fonts.body2Reg, color: colors.text, flex: 1},
  card: {borderRadius: 18, backgroundColor: neutral._9},
  cardTitle: {
    ...fonts.body1Bold,
    color: colors.text,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: neutral._8,
  },
  cardRow: {marginHorizontal: 18, paddingVertical: 10},
  cardDivider: {borderTopWidth: 2, borderTopColor: neutral._8},
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  kvStacked: {flexDirection: 'column', alignItems: 'flex-start', gap: 4},
  kvLabel: {...fonts.body2Reg, color: colors.textMuted},
  kvValue: {
    ...fonts.body2Reg,
    color: colors.text,
    textAlign: 'right',
    flexShrink: 1,
  },
  kvLeft: {textAlign: 'left'},
  pill: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: neutral._7,
    backgroundColor: neutral._9,
  },
  raw: {gap: 8},
  rawToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 3,
  },
  rawToggleText: {...fonts.body2Reg, color: colors.textMuted},
  rawBox: {
    maxHeight: 200,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: neutral._7,
    backgroundColor: neutral._9,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rawText: {...monoFont, fontSize: 12, lineHeight: 18, color: colors.text},
});
