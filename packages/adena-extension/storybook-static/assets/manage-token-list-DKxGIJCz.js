import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,b as r,c as i,g as a,i as o,n as s,r as c,rt as l,s as u,t as d}from"./iframe-BclzClxJ.js";import{i as f,r as p}from"./highlight-number-5tnmBTh7.js";import{n as m,t as h}from"./toggle-B3-Zs6z_.js";import{n as g,t as _}from"./token-balance-BhumaEBF.js";import{n as v,t as y}from"./icon-empty-image-zNZyxAND.js";var b,x,S=e((()=>{u(),o(),n(),b=a.div`
  ${i.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;
`,x=a.div`
  ${i.flex({direction:`row`,justify:`flex-start`})};
  padding: 10px 14px;
  width: 100%;
  height: auto;
  background: ${c(`neutral`,`_9`)};
  border-radius: 18px;
  transition: 0.2s;

  & + & {
    margin-top: 12px;
  }

  .logo-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    margin-right: 12px;

    .logo {
      width: 100%;
      height: 100%;
      border-radius: 50%;

      &.empty {
        background-color: ${c(`neutral`,`_7`)};
      }
    }

    .icon-empty {
      display: block;
      width: 20px;
      height: 100%;
      margin: auto;
    }

    &.square {
      .logo {
        border-radius: 8px;
      }
    }
  }

  .name-wrapper {
    display: inline-flex;
    flex-direction: column;
    margin-top: 4px;
    height: 35px;
    white-space: pre;
    justify-content: space-between;

    .name {
      ${s.body2Bold};
      line-height: 15px;
    }

    .balance {
      color: ${c(`neutral`,`a`)};
      ${s.captionReg};
    }
  }

  .toggle-wrapper {
    display: inline-flex;
    width: 100%;
    height: auto;
    align-items: flex-start;
    justify-content: flex-end;
  }
`}));function C(e){return e.type===`token`}var w,T,E,D=e((()=>{v(),m(),f(),w=t(l()),n(),g(),S(),T=d(),E=({token:e,queryGRC721TokenUri:t,queryGRC721Balance:n,onToggleActiveItem:i})=>{let a=r(),[o,s]=(0,w.useState)(!1),c=C(e),l=!c&&e.isTokenUri&&t?t(e.packagePath,`0`,{enabled:!!e.isTokenUri}):null,u=!c&&n?n(e.packagePath,{refetchOnMount:!0}):null,d=(0,w.useMemo)(()=>!o||!l||!l.data?null:l.data,[l]),f=(0,w.useMemo)(()=>{if(c)return``;if(u===null||u.data===void 0||u.data===null)return`-`;let e=p(u.data);return e.isGreaterThan(1)?`${e.toFormat()} Items`:`${e.toFormat()} Item`},[e]);return c?(0,T.jsxs)(x,{children:[(0,T.jsx)(`div`,{className:`logo-wrapper`,children:(0,T.jsx)(`img`,{className:`logo`,src:e.logo,alt:`token img`,onError:()=>{s(!0)}})}),(0,T.jsxs)(`div`,{className:`name-wrapper`,children:[(0,T.jsx)(`span`,{className:`name`,children:e.name}),(0,T.jsx)(_,{value:e.balance.value,denom:e.balance.denom,orientation:`HORIZONTAL`,fontColor:a.neutral.a,fontStyleKey:`captionReg`,minimumFontSize:`10px`})]}),(0,T.jsx)(`div`,{className:`toggle-wrapper`,children:!e.main&&(0,T.jsx)(h,{activated:e.display===!0,onToggle:()=>i(e.tokenId,!e.display)})})]}):(0,T.jsxs)(x,{children:[(0,T.jsx)(`div`,{className:`logo-wrapper square`,children:d?(0,T.jsx)(`img`,{className:`logo`,src:d,alt:`token img`}):(0,T.jsx)(`div`,{className:`logo empty`,children:(0,T.jsx)(`img`,{className:`icon-empty`,src:y,alt:`token empty`})})}),(0,T.jsxs)(`div`,{className:`name-wrapper`,children:[(0,T.jsx)(`span`,{className:`name`,children:e.name}),(0,T.jsx)(`span`,{className:`balance`,children:f})]}),(0,T.jsx)(`div`,{className:`toggle-wrapper`,children:(0,T.jsx)(h,{activated:e.display===!0,onToggle:()=>i(e.packagePath,!e.display)})})]})},E.__docgenInfo={description:``,methods:[],displayName:`ManageTokenListItem`,props:{token:{required:!0,tsType:{name:`union`,raw:`ManageTokenInfo | ManageGRC721Info`,elements:[{name:`ManageTokenInfo`},{name:`ManageGRC721Info`}]},description:``},queryGRC721TokenUri:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},queryGRC721Balance:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<number | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]}],raw:`UseQueryResult<number | null>`}}},description:``},onToggleActiveItem:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(tokenId: string, activated: boolean) => void`,signature:{arguments:[{type:{name:`string`},name:`tokenId`},{type:{name:`boolean`},name:`activated`}],return:{name:`void`}}},description:``}}}})),O,k,A=e((()=>{l(),S(),D(),O=d(),k=({tokens:e,queryGRC721TokenUri:t,queryGRC721Balance:n,onToggleActiveItem:r})=>(0,O.jsx)(b,{children:e.map((e,i)=>(0,O.jsx)(E,{token:e,onToggleActiveItem:r,queryGRC721TokenUri:t,queryGRC721Balance:n},i))}),k.__docgenInfo={description:``,methods:[],displayName:`ManageTokenList`,props:{tokens:{required:!0,tsType:{name:`union`,raw:`ManageTokenInfo[] | ManageGRC721Info[]`,elements:[{name:`Array`,elements:[{name:`ManageTokenInfo`}],raw:`ManageTokenInfo[]`},{name:`Array`,elements:[{name:`ManageGRC721Info`}],raw:`ManageGRC721Info[]`}]},description:``},queryGRC721TokenUri:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},queryGRC721Balance:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<number | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]}],raw:`UseQueryResult<number | null>`}}},description:``},onToggleActiveItem:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(tokenId: string, activated: boolean) => void`,signature:{arguments:[{type:{name:`string`},name:`tokenId`},{type:{name:`boolean`},name:`activated`}],return:{name:`void`}}},description:``}}}}));export{A as n,k as t};