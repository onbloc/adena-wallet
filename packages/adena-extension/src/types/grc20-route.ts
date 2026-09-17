/**
 * GRC20 `routes` metadata, published per chain in `gno-token-resource`
 * (`/grc20/{chainId}.json`). Declares the direct `MsgCall` shape into the
 * token's own realm, which is not uniform across realms.
 *
 * @see https://github.com/onbloc/gno-token-resource/pull/73
 */
export interface Grc20RouteFunc {
  name: string;
  /**
   * Every argument except the leading `cur realm`, in declaration order.
   * A `$`-prefixed element is a placeholder; anything else is a literal
   * (`$$` escapes a literal `$`).
   */
  args: string[];
}

// Open set: a realm declares whatever operations its users need.
export type Grc20RouteFuncs = Record<string, Grc20RouteFunc>;

export interface Grc20Route {
  funcs: Grc20RouteFuncs;
}

// Registry key (`{pkgPath}.{symbol}`) -> route.
export type Grc20RouteMap = Record<string, Grc20Route>;
