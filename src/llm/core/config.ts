// Low temperature: tool calls need stable names and arguments.
export const DEFAULT_GENERATE_SETTINGS = {
  temperature: 0.2,
  maxOutputTokens: 512,
  reasoning: 'none' as 'none' | 'provider-default',
};

// Bound for UI input.
export const TEMPERATURE_RANGE = { min: 0, max: 2 } as const;
