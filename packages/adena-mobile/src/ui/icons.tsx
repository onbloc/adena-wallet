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

export function BookIcon({size = 18, color = colors.textMuted}: IconProps) {
  const s = stroke(color, 1.3);
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        d="M13 2.4375H4C3.17157 2.4375 2.5 3.10907 2.5 3.9375V12.2996V13.9375C2.5 14.7659 3.17157 15.4375 4 15.4375H14C14.2761 15.4375 14.5 15.2136 14.5 14.9375V3.9375C14.5 3.10907 13.8284 2.4375 13 2.4375Z"
        {...s}
      />
      <Path d="M6.5 6.4375H10.5" {...s} />
      <Path d="M14.5 13.4375H4C3.17157 13.4375 2.5 13.8852 2.5 14.4375" {...s} />
    </Svg>
  );
}

export function EditSmallIcon({size = 11, color = colors.textMuted}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 11">
      <Path
        d="M8.16052 4.79623L3.64775 9.35447L2.99173 8.69156L3.05947 8.62311H2.16736C1.99707 8.62311 1.85774 8.48232 1.85774 8.31024V7.40876L1.7902 7.4772C1.69867 7.57106 1.63152 7.68448 1.59494 7.80963L1.15025 9.33882L2.66276 8.88906C2.76919 8.85191 2.89885 8.78346 2.99173 8.69156L3.64775 9.35447C3.44649 9.55784 3.19686 9.70841 2.924 9.78858L0.59544 10.4808C0.432501 10.5297 0.256209 10.4847 0.136036 10.3459C0.0158632 10.2423 -0.0290709 10.0643 0.0188821 9.89809L0.703809 7.54564C0.784311 7.26992 0.931963 7.01766 1.13341 6.81429L5.64482 2.25488L8.16052 4.79623Z"
        fill={color}
      />
      <Path
        d="M9.63785 1.63767C10.1216 2.12635 10.1216 2.91949 9.63785 3.40836L8.70124 4.35482L6.18555 1.81308L7.12216 0.866624C7.60595 0.377792 8.39162 0.377792 8.8754 0.866624L9.63785 1.63767Z"
        fill={color}
      />
    </Svg>
  );
}
