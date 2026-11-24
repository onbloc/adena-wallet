import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  Cloud,
  Copy,
  Delete,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  History,
  House,
  Info,
  KeyRound,
  Link,
  LoaderCircle,
  Lock,
  LucideIcon,
  Palette,
  Plus,
  QrCode,
  ScanFace,
  ScanLine,
  Search,
  Settings,
  Share2,
  Shield,
  Trash2,
  TriangleAlert,
  User,
  Wallet,
  X,
} from 'lucide-react-native';
import React, { ReactElement } from 'react';

import { sizes, useThemeColors } from '../../../theme';
import { GlyphProps, TokenSwapGlyph } from './token-swap-glyph';

// 13 guide icon families plus wallet-specific glyphs, all on a 24px / 2px-stroke grid.
const ICONS = {
  home: House,
  search: Search,
  activity: History,
  swap: ArrowLeftRight,
  tokenSwap: TokenSwapGlyph,
  arrowDown: ArrowDown,
  settings: Settings,
  close: X,
  check: Check,
  info: Info,
  loader: LoaderCircle,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  arrowLeft: ArrowLeft,
  copy: Copy,
  scan: ScanLine,
  qrCode: QrCode,
  share: Share2,
  backspace: Delete,
  plus: Plus,
  eye: Eye,
  eyeOff: EyeOff,
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  alert: CircleAlert,
  wallet: Wallet,
  link: Link,
  fingerprint: Fingerprint,
  faceId: ScanFace,
  lock: Lock,
  key: KeyRound,
  globe: Globe,
  user: User,
  trash: Trash2,
  palette: Palette,
  camera: Camera,
  cloud: Cloud,
  shield: Shield,
} satisfies Record<string, LucideIcon | ((props: GlyphProps) => ReactElement)>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon = ({ name, size = sizes.icon, color }: IconProps): ReactElement => {
  const Glyph = ICONS[name];
  const fallback = useThemeColors().icon.primary;

  return <Glyph size={size} color={color ?? fallback} strokeWidth={sizes.iconStroke} />;
};
