import type { GenerateEvent, GenerateSettings, LLM, LLMGenerateOptions } from '../../llm/core';

/** One model call of a run. */
export type Stage = { label: StageLabel; ms: number; outputTokens?: number };

/**
 * Within one run the agent's structured calls come in a fixed order: the first classifies the
 * request, the second extracts the transaction (or selects the read tools). A call with no output
 * schema writes an answer. The labels come from that order, not from the agent.
 */
export type StageLabel = 'classify' | 'extract' | 'answer';

/** Passes every call through unchanged and times it. */
export class TimingLLM implements LLM {
  private stages: Stage[] = [];

  constructor(
    private readonly inner: LLM,
    private readonly now: () => number = Date.now
  ) {}

  get contextTokens() {
    return this.inner.contextTokens;
  }

  /** The calls since the last `take`; starts a new list. */
  take(): Stage[] {
    const taken = this.stages;
    this.stages = [];
    return taken;
  }

  async *generate(settings: GenerateSettings, options?: LLMGenerateOptions): AsyncGenerator<GenerateEvent> {
    const label: StageLabel =
      settings.outputSchema === undefined ? 'answer' : this.stages.some(({ label: seen }) => seen === 'classify') ? 'extract' : 'classify';
    const started = this.now();
    let outputTokens: number | undefined;
    try {
      for await (const event of this.inner.generate(settings, options)) {
        if (event.type === 'done') outputTokens = event.metrics.outputTokens;
        yield event;
      }
    } finally {
      this.stages.push({ label, ms: this.now() - started, ...(outputTokens !== undefined && { outputTokens }) });
    }
  }
}
