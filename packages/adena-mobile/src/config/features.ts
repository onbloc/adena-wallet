// Product feature flags. A chain family stays hidden until its module is registered.
export const FEATURES = {
  // AtomOne (cosmos family): module, resources and tests are ready; flip to true to list its networks.
  atomone: false,
  // Home Buy stays disabled until an on-ramp provider is contracted; the flow itself is kept.
  buy: false,
} as const;
