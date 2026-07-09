import { css } from 'styled-components';

// Fades and inerts the content of a `<main>` while the current session account
// is revoked.
//
// The rule targets the children rather than the element itself so the scroll
// container stays interactive (a revoked account can still scroll its list) and
// so the app header and footer — siblings of `<main>` — keep their normal
// appearance and click targets.
export const revokedDimStyle = css<{ $dimmed: boolean }>`
  ${({ $dimmed }): string =>
    $dimmed
      ? `& > * {
    opacity: 0.5;
    pointer-events: none;
  }`
      : ''}
`;
