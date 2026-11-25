import { createContext, use } from 'react';

import { HapticKind } from '../domain/haptics';

export type PlayHaptic = (kind?: HapticKind) => void;

// No-op until the app shell provides the preference-aware player, so stories and tests stay silent.
export const HapticsContext = createContext<PlayHaptic>(() => undefined);

export const useHaptics = (): PlayHaptic => use(HapticsContext);
