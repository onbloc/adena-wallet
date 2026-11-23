import type { CallRecord } from '../llm/calls';
import { normalizeDecimal } from './amount';
import type { RunObservation } from './observation';
import type { ExpectedCall, Scenario } from './scenarios';

export type Check = { name: string; pass: boolean; detail: string };
export type Verdict = { pass: boolean; checks: Check[] };

const describeCall = (call: CallRecord) =>
  `${call.name}(${JSON.stringify(call.input)})`;

const describeCalls = (calls: CallRecord[]) =>
  calls.length === 0 ? 'no tool calls' : calls.map(describeCall).join(', ');

// Decimal strings compare by value ("0.50" == "0.5"); everything else strictly.
function sameValue(expected: unknown, actual: unknown): boolean {
  if (typeof expected === 'string' && typeof actual === 'string') {
    const a = normalizeDecimal(expected);
    const b = normalizeDecimal(actual);
    if (a !== null && b !== null) return a === b;
  }
  return expected === actual;
}

function matches(expected: ExpectedCall, call: CallRecord): boolean {
  if (call.invalid || call.name !== expected.tool) return false;
  const input = (call.input ?? {}) as Record<string, unknown>;
  return Object.entries(expected.args ?? {}).every(([key, value]) =>
    sameValue(value, input[key])
  );
}

/**
 * Compares what the model did with a scenario's expectations. Strict: an
 * invalid call fails the verdict even if a later retry succeeds.
 */
export function evaluateScenario(scenario: Scenario, observation: RunObservation): Verdict {
  const { calls, answer, approvals, balances, allowances } = observation;
  const checks: Check[] = [];

  // Greedy earliest match is optimal for ordered-subsequence matching.
  let cursor = 0;
  scenario.calls.forEach((expected, i) => {
    const found = calls.findIndex((call, index) => index >= cursor && matches(expected, call));
    if (found >= 0) cursor = found + 1;
    checks.push({
      name: `call ${i + 1}: ${expected.tool}(${JSON.stringify(expected.args ?? {})})`,
      pass: found >= 0,
      detail: found >= 0 ? describeCall(calls[found]) : `not found; got ${describeCalls(calls)}`,
    });
  });

  for (const tool of scenario.forbid ?? []) {
    const hit = calls.find((call) => call.name === tool);
    checks.push({
      name: `${tool} not called`,
      pass: hit === undefined,
      detail: hit ? describeCall(hit) : 'ok',
    });
  }

  const invalid = calls.filter((call) => call.invalid);
  checks.push({
    name: 'no invalid tool calls',
    pass: invalid.length === 0,
    detail: invalid.length === 0 ? 'ok' : invalid.map(describeCall).join(', '),
  });

  if (scenario.approvalRequests !== undefined) {
    checks.push({
      name: `signing popup shown ${scenario.approvalRequests} time(s)`,
      pass: approvals.length === scenario.approvalRequests,
      detail: `shown ${approvals.length} time(s)`,
    });
  }

  for (const expected of scenario.balances ?? []) {
    const actual = balances[expected.address]?.[expected.token];
    const pass =
      actual !== undefined &&
      normalizeDecimal(actual) === normalizeDecimal(expected.amount);
    checks.push({
      name: `balance ${expected.address.slice(0, 8)}... ${expected.token} = ${expected.amount}`,
      pass,
      detail: pass ? 'ok' : `got ${actual ?? 'not observed'}`,
    });
  }

  for (const expected of scenario.allowances ?? []) {
    const actual =
      allowances.find((a) => a.spender === expected.spender && a.token === expected.token)
        ?.amount ?? '0';
    const pass = normalizeDecimal(actual) === normalizeDecimal(expected.amount);
    checks.push({
      name: `allowance ${expected.spender.slice(0, 8)}... ${expected.token} = ${expected.amount}`,
      pass,
      detail: pass ? 'ok' : `got ${actual}`,
    });
  }

  for (const word of scenario.answerMentions ?? []) {
    const pass = answer.toLowerCase().includes(word.toLowerCase());
    checks.push({
      name: `answer mentions "${word}" (heuristic)`,
      pass,
      detail: pass ? 'ok' : 'not found in the answer',
    });
  }

  return { pass: checks.every((check) => check.pass), checks };
}
