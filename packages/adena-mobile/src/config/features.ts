// Product feature flags. A chain family stays hidden until its module is registered.
export const FEATURES = {
  // AtomOne (cosmos family): module, resources and tests are ready; flip to true to list its networks.
  atomone: false,
} as const;
