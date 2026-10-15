import React from 'react';

import {formatGnot} from '../core/format';
import {Address} from '../ui/address';
import {KeyValue, MessageCard} from './approval-ui';

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
  const n = `${index + 1}.`;
  switch (message?.type) {
    case '/bank.MsgSend':
      return (
        <MessageCard title={`${n} Send GNOT`}>
          <KeyValue label="Amount" value={ugnot(value.amount)} />
          <KeyValue
            label="To"
            stacked
            value={<Address value={String(value.to_address ?? '')} />}
          />
        </MessageCard>
      );
    case '/vm.m_call': {
      const args: unknown[] = Array.isArray(value.args) ? value.args : [];
      return (
        <MessageCard title={`${n} ${String(value.func ?? 'Call')}`}>
          <KeyValue
            label="realm"
            stacked
            value={String(value.pkg_path ?? '')}
          />
          {args.map((arg, i) => (
            <KeyValue key={i} label={`arg${i + 1}`} value={String(arg)} />
          ))}
          <KeyValue label="send" value={ugnot(value.send)} />
          {value.max_deposit ? (
            <KeyValue label="max_deposit" value={ugnot(value.max_deposit)} />
          ) : null}
        </MessageCard>
      );
    }
    case '/vm.m_addpkg':
    case '/vm.m_run': {
      const pkg = value.package ?? {};
      return (
        <MessageCard
          title={`${n} ${
            message.type === '/vm.m_run' ? 'Run code' : 'Deploy package'
          }`}>
          <KeyValue
            label="package"
            stacked
            value={String(pkg.path ?? pkg.Path ?? '')}
          />
          <KeyValue
            label="files"
            value={String((pkg.files ?? pkg.Files ?? []).length)}
          />
          {message.type === '/vm.m_run' && (
            <KeyValue label="send" value={ugnot(value.send)} />
          )}
        </MessageCard>
      );
    }
    default:
      return (
        <MessageCard
          title={`${n} ${String(message?.type ?? 'Unknown message')}`}>
          <KeyValue
            label="value"
            stacked
            value={JSON.stringify(value, null, 2)}
          />
        </MessageCard>
      );
  }
}
