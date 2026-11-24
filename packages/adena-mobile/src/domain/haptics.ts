export const HapticKind = {
  // Light tap for key presses and primary actions.
  IMPACT: 'impact',
  // Discrete change such as a tab, switch or keypad key.
  SELECTION: 'selection',
  SUCCESS: 'success',
} as const;

export type HapticKind = (typeof HapticKind)[keyof typeof HapticKind];
