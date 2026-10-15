/**
 * The extension's popup icons that ship as DOM <svg> components
 * (assets/icon-*.tsx, components/atoms/icon/icon-assets/*.tsx), redrawn with
 * react-native-svg from the same path data. Icons that exist as .svg files
 * are imported directly from @assets instead.
 */
import React from 'react';
import Svg, {Circle, Ellipse, Path} from 'react-native-svg';

import {colors} from './theme';

type IconProps = {size?: number; color?: string};

const stroke = (color: string, width: number) => ({
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function DepositIcon({size = 19, color = colors.textMuted}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19">
      <Path d="M13.3359 5.5L5.83594 13.4167" {...stroke(color, 1.5)} />
      <Path d="M12.8359 14H4.83594V6" {...stroke(color, 1.5)} />
    </Svg>
  );
}

export function SendIcon({size = 19, color = colors.textMuted}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19">
      <Path
        d="M16.8854 9.49989L4.21875 15.3054V9.49989M16.8854 9.49989L4.21875 3.69434V9.49989M16.8854 9.49989H4.21875"
        {...stroke(color, 1.5)}
      />
    </Svg>
  );
}

export function CopyIcon({size = 16, color = colors.textMuted}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M6.0557 1.99978L12.5558 1.99978C12.9389 1.99978 13.3063 2.15197 13.5771 2.42285C13.848 2.69374 14.0002 3.06115 14.0002 3.44424L14.0002 9.9443M11.389 6.05549L11.389 12.5555C11.389 13.3533 10.7423 14 9.94451 14L3.44446 14C2.64671 14 2 13.3533 2 12.5555L2 6.05549C2 5.25774 2.64671 4.61103 3.44446 4.61103L9.94451 4.61103C10.7423 4.61103 11.389 5.25774 11.389 6.05549Z"
        {...stroke(color, 1.2)}
      />
    </Svg>
  );
}

export function CopyCheckIcon({size = 16, color = colors.text}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M3 7.5L6.33333 12L13 3" {...stroke(color, 1.2)} />
    </Svg>
  );
}

export function GlobeIcon({size = 26, color = colors.textMuted}: IconProps) {
  const s = stroke(color, 1.3);
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26">
      <Ellipse cx="13.0026" cy="12.9997" rx="2.97917" ry="7.85417" {...s} />
      <Path d="M5.14844 13H20.8568" {...s} />
      <Circle cx="13.0026" cy="12.9997" r="7.85417" {...s} />
    </Svg>
  );
}

export function ChevronDownIcon({size = 12, color = colors.text}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path
        d="M1 3.94414L1.8875 3.05664L6 7.16913L10.1125 3.05664L11 3.94414L6 8.94413L1 3.94414Z"
        fill={color}
      />
    </Svg>
  );
}

export function ChevronRightIcon({
  size = 16,
  color = colors.textMuted,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M6 12L10 8L6 4" {...stroke(color, 1.5)} />
    </Svg>
  );
}

export function LockIcon({size = 18, color = colors.textMuted}: IconProps) {
  const s = stroke(color, 1.3);
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        d="M4 10.2588C4 9.15422 4.89543 8.25879 6 8.25879H12.1104C13.215 8.25879 14.1104 9.15422 14.1104 10.2588V12.999C14.1104 14.1036 13.215 14.999 12.1104 14.999H6C4.89543 14.999 4 14.1036 4 12.999V10.2588Z"
        {...s}
      />
      <Path
        d="M6 7.82557L6 4.99997C6 3.8954 6.89544 2.99997 8.00001 2.99998L10 2.99999C11.1046 2.99999 12 3.89542 12 4.99999L12 8"
        {...s}
      />
      <Circle cx="9.0564" cy="11.6289" r="0.9624" fill={color} />
    </Svg>
  );
}

export function MapRouteIcon({size = 18, color = colors.textMuted}: IconProps) {
  const s = stroke(color, 1.3);
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Circle cx="4.25" cy="4.25" r="2" {...s} />
      <Circle cx="14.25" cy="14.25" r="2" {...s} />
      <Path
        d="M9.04096 5.25H11.4122C12.1571 5.25 12.5302 6.32714 12.0034 6.95711L6.49658 13.5429C5.96983 14.1729 6.3429 15.25 7.08785 15.25H9.45904"
        {...s}
      />
    </Svg>
  );
}

export function SecurityIcon({size = 18, color = colors.textMuted}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        d="M3 13.13V8.435C3 7.8464 3.27712 7.29216 3.748 6.939L7.878 3.8415C8.54289 3.34283 9.45711 3.34283 10.122 3.8415L14.252 6.939C14.7229 7.29216 15 7.8464 15 8.435V13.13C15 14.1628 14.1628 15 13.13 15H4.87C3.83723 15 3 14.1628 3 13.13Z"
        {...stroke(color, 1.3)}
      />
    </Svg>
  );
}
