import { Harness } from '../harness';
import type { PolicyEvent, RunContext } from '../dispatch';
import type { RemoteTool, ToolSource } from '../tools';

const run: RunContext = {
  account: 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v',
  chainId: 'gnoland-1',
  operationId: 'op-1',
  scope: 'read-only',
  purpose: 'mainnet-read',
};

const tool = (name: string): RemoteTool => ({
  definition: { name, description: name, jsonSchema: { type: 'object', properties: {} } },
  execute: async () => ({ kind: 'result', value: `${name} ran` }),
});

/** A source that offers the named tools and records the account it was asked for. */
const source = (...names: string[]) => {
  const asked: string[] = [];
  const toolSource: ToolSource = async ({ account }) => {
    asked.push(account);
    return new Map(names.map((name) => [name, tool(name)]));
  };
  return { toolSource, asked };
};

describe('Harness', () => {
  it('lists the tools its sources offer for the run account and runs them', async () => {
    const { toolSource, asked } = source('ping');
    const harness = new Harness({ toolSources: [toolSource] });

    const started = await harness.startRun(run);

    expect(asked).toEqual([run.account]);
    expect(started.tools.map((t) => t.name)).toEqual(['ping']);
    expect(await started.dispatch({ name: 'ping', input: {} })).toEqual({ kind: 'result', value: 'ping ran' });
    started.close();
  });

  it('merges the tools of several sources', async () => {
    const harness = new Harness({ toolSources: [source('a').toolSource, source('b').toolSource] });

    const started = await harness.startRun(run);

    expect(started.tools.map((t) => t.name)).toEqual(['a', 'b']);
    started.close();
  });

  it('refuses two sources that offer the same tool name', async () => {
    const harness = new Harness({ toolSources: [source('a').toolSource, source('a').toolSource] });

    await expect(harness.startRun(run)).rejects.toThrow('Could not discover remote tools.');
  });

  it('refuses a tool whose name would shadow an object property', async () => {
    const harness = new Harness({ toolSources: [source('constructor').toolSource] });

    await expect(harness.startRun(run)).rejects.toThrow('Could not discover remote tools.');
  });

  it('denies a tool the model invents', async () => {
    const harness = new Harness({ toolSources: [source('ping').toolSource] });
    const started = await harness.startRun(run);

    expect(await started.dispatch({ name: 'burn_everything', input: {} })).toEqual({
      kind: 'denied',
      code: 'UNKNOWN_TOOL',
    });
    started.close();
  });

  it('stops dispatching once the tool-call budget is used up, and a run can override the budget', async () => {
    const harness = new Harness({ toolSources: [source('ping').toolSource] });
    const started = await harness.startRun({ ...run, budget: { maxToolCalls: 2 } });

    const kinds = [];
    for (let i = 0; i < 3; i++) kinds.push((await started.dispatch({ name: 'ping', input: {} })).kind);

    expect(kinds).toEqual(['result', 'result', 'denied']);
    expect(await started.dispatch({ name: 'ping', input: {} })).toEqual({
      kind: 'denied',
      code: 'BUDGET_EXHAUSTED',
    });
    started.close();
  });

  it('counts steps against the budget', async () => {
    const harness = new Harness({ toolSources: [source('ping').toolSource] });
    const started = await harness.startRun({ ...run, budget: { maxSteps: 1 } });

    expect(started.beginStep(100, 10)).toBeDefined();
    started.finishStep(50);

    expect(started.canStartStep()).toBe(false);
    started.close();
  });

  it('denies calls after the run is cancelled', async () => {
    const controller = new AbortController();
    const harness = new Harness({ toolSources: [source('ping').toolSource] });
    const started = await harness.startRun({ ...run, signal: controller.signal });

    controller.abort();

    expect(await started.dispatch({ name: 'ping', input: {} })).toEqual({ kind: 'denied', code: 'CANCELLED' });
  });

  it('rejects an invalid budget', async () => {
    const harness = new Harness({ toolSources: [source('ping').toolSource] });

    await expect(harness.startRun({ ...run, budget: { maxSteps: 0 } })).rejects.toThrow('Invalid execution budget');
  });

  it('audits every decision', async () => {
    const events: PolicyEvent[] = [];
    const harness = new Harness({ toolSources: [source('ping').toolSource], audit: (event) => void events.push(event) });
    const started = await harness.startRun(run);

    await started.dispatch({ name: 'ping', input: {} });
    await started.dispatch({ name: 'nope', input: {} });

    expect(events.map((e) => [e.tool, e.decision, e.denial])).toEqual([
      ['ping', 'result', undefined],
      [undefined, 'denied', 'UNKNOWN_TOOL'],
    ]);
    started.close();
  });
});
