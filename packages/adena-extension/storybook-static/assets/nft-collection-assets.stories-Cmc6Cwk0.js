import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,b as r,g as i,i as a,r as o,rt as s,t as c}from"./iframe-DekVl-_p.js";import{h as l,t as u}from"./atoms-DPNcwsZr.js";import{p as d,r as f}from"./approve-ledger-loading-BquluU52.js";import{n as p,t as m}from"./nft-collection-asset-card-BkouvfYz.js";var h,g=t((()=>{a(),n(),h=i.div`
  position: relative;
  display: grid;
  width: 100%;
  min-height: auto;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  .description {
    position: absolute;
    top: 139px;
    left: 0px;
    width: 100%;
    text-align: center;
  }

  .loading-wrapper {
    position: absolute;
    width: 100%;
    height: auto;
    top: 0;
    left: 0;
    background-color: ${o(`neutral`,`_8`)};
  }
`})),_,v,y,b=t((()=>{u(),f(),_=e(s()),n(),p(),g(),v=c(),y=({tokens:e,isFetchedTokens:t,queryGRC721TokenUri:n,moveAssetPage:i})=>{let a=r(),o=(0,_.useMemo)(()=>t?e===null:!0,[t,e]);return(0,_.useMemo)(()=>e?.length===0,[e])?(0,v.jsx)(h,{children:(0,v.jsx)(l,{className:`description`,type:`body1Reg`,color:a.neutral.a,children:`No NFTs to display`})}):(0,v.jsxs)(h,{children:[e?.map((e,t)=>(0,v.jsx)(m,{grc721Token:e,queryGRC721TokenUri:n,moveAssetPage:i},t)),o&&(0,v.jsx)(`div`,{className:`loading-wrapper`,children:(0,v.jsx)(d,{})})]})},y.__docgenInfo={description:``,methods:[],displayName:`NFTCollectionAssets`,props:{tokens:{required:!0,tsType:{name:`union`,raw:`GRC721Model[] | null | undefined`,elements:[{name:`Array`,elements:[{name:`GRC721Model`}],raw:`GRC721Model[]`},{name:`null`},{name:`undefined`}]},description:``},isFetchedTokens:{required:!0,tsType:{name:`boolean`},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: Omit<UseQueryOptions<string | null, Error>, 'queryKey' | 'queryFn'>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`Omit`,elements:[{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},{name:`union`,raw:`'queryKey' | 'queryFn'`,elements:[{name:`literal`,value:`'queryKey'`},{name:`literal`,value:`'queryFn'`}]}],raw:`Omit<UseQueryOptions<string | null, Error>, 'queryKey' | 'queryFn'>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},moveAssetPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(grc721Token: GRC721Model) => void`,signature:{arguments:[{type:{name:`GRC721Model`},name:`grc721Token`}],return:{name:`void`}}},description:``}}}})),x,S,C;t((()=>{b(),x={title:`components/nft/NFTCollectionAssets`,component:y},S={args:{}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {}
}`,...S.parameters?.docs?.source}}},C=[`Default`]}))();export{S as Default,C as __namedExportsOrder,x as default};