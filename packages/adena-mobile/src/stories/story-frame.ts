// Design reference canvas (390 x 844) with iPhone-like insets, shared by Storybook and story tests.
export const PHONE_FRAME = { width: 390, height: 844, overflow: 'hidden' } as const;

export const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
