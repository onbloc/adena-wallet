import { createHarness, type HarnessRun, type PolicyEvent, type RunContext, type Budget } from './dispatch';
import type { ToolSource, WalletReader } from './tools';

export type HarnessOptions = {
  /** Default limits of a run; a run can override them. */
  budget?: Budget;
  /** Where the runs' remote tools come from, e.g. MCP servers. */
  toolSources?: readonly ToolSource[];
  /** Called for every decision; failure flags that decision and pauses new work without discarding it. */
  audit?: (event: PolicyEvent) => void | Promise<void>;
  wallet?: WalletReader;
};

/**
 * Bounds and polices a tool-using run: a step, token and time budget, what each tool may do,
 * and a decision for every call the model proposes. Knows no model and no AI SDK.
 */
export class Harness {
  private readonly start: (run: RunContext) => Promise<HarnessRun>;

  constructor(options: HarnessOptions = {}) {
    this.start = createHarness(options).startRun;
  }

  /** Discovers the tools for the run's account and chain, then returns the run to step through. */
  startRun(run: RunContext): Promise<HarnessRun> {
    return this.start(run);
  }
}
