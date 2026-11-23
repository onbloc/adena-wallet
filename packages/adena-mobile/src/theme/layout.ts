// 4px base / 8px rhythm on a 390 x 844 reference canvas.
export const spacing = {
  space4: 4,
  space8: 8,
  space12: 12,
  space16: 16,
  space20: 20,
  space24: 24,
  space32: 32,
} as const;

export const radius = {
  smallControl: 8,
  input: 12,
  surface: 16,
  sheet: 24,
  circle: 999,
} as const;

export const sizes = {
  touchTarget: 44,
  icon: 24,
  iconStroke: 2,
  control: 52,
  controlCompact: 44,
  chip: 32,
  assetRow: 60,
  expandedRow: 72,
  topBar: 56,
  bottomNavigation: 64,
  tab: 44,
  screenInset: spacing.space20,
} as const;

export const motion = {
  press: 140,
  transition: 220,
} as const;

export const elevation = {
  overlay: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.12,
    elevation: 6,
  },
} as const;
