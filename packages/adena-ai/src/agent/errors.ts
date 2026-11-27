export type AgentErrorCode =
  | 'AGENT_TURN_ACTIVE'
  | 'AGENT_ACCOUNT_REQUIRED'
  | 'AGENT_PROMPT_LIMIT'
  | 'AGENT_CONTEXT_LIMIT'
  | 'AGENT_INTENT_INVALID'
  | 'AGENT_LOOKUP_TOOLS_INVALID'
  | 'AGENT_PREPARATION_INVALID'
  | 'AGENT_RUN_CANNOT_START_STEP'
  | 'AGENT_CLOUD_BUDGET_EXHAUSTED'
  | 'AGENT_RUN_CANCELLED';

/** A failure of the agent itself; hosts branch on `code`, the message is for people. */
export class AgentError extends Error {
  constructor(readonly code: AgentErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'AgentError';
  }
}

export const isAgentError = (error: unknown, code: AgentErrorCode): error is AgentError =>
  error instanceof AgentError && error.code === code;
