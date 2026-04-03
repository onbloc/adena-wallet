import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,b as r,g as i,i as a,r as o,rt as s,t as c}from"./iframe-BclzClxJ.js";import{h as l,t as u}from"./atoms-kch4SvDy.js";import{p as d,r as f}from"./approve-ledger-loading-BtJ73zaA.js";import{n as p,t as m}from"./manage-collections-button-Dc3sziF_.js";import{n as h,t as g}from"./nft-collection-card-T1Z2_AIl.js";var _,v=e((()=>{a(),n(),_=i.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 24px;

  &.non-items {
    padding-top: 151px;
  }

  .collection-wrapper {
    display: grid;
    width: 100%;
    min-height: auto;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .description {
    position: absolute;
    top: 139px;
    left: 0px;
    width: 100%;
    text-align: center;
  }

  .manage-collection-button-wrapper {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
  }

  .loading-wrapper {
    position: absolute;
    width: 100%;
    height: auto;
    top: 0;
    left: 0;
    background-color: ${o(`neutral`,`_8`)};
  }
`})),y,b,x,S=e((()=>{u(),f(),y=t(s()),n(),p(),h(),v(),b=c(),x=({isFetchedCollections:e,collections:t,isFetchedPinnedCollections:n,pinnedCollections:i,pin:a,unpin:o,queryGRC721TokenUri:s,queryGRC721Balance:c,moveCollectionPage:u,moveManageCollectionsPage:f})=>{let p=r(),h=(0,y.useMemo)(()=>!e||!n?!0:t===null,[e,n,t]),v=(0,y.useMemo)(()=>t?.length===0,[t]),x=(0,y.useMemo)(()=>t?.filter(e=>e.display),[t]),S=(0,y.useMemo)(()=>x?.filter(e=>e.display).length===0,[x]),C=(0,y.useMemo)(()=>{if(!Array.isArray(x))return x;if(!Array.isArray(i))return null;let e=i.map(e=>x.find(t=>t.packagePath===e)).filter(e=>!!e),t=x.filter(e=>!i.includes(e.packagePath));return[...e,...t]},[i,x]),w=(0,y.useCallback)(e=>i?i.findIndex(t=>t===e.packagePath)>-1:!1,[i]),T=(0,y.useCallback)(()=>{f()},[f]);return v?(0,b.jsx)(_,{children:(0,b.jsx)(l,{className:`description`,type:`body1Reg`,color:p.neutral.a,children:`No NFTs to display`})}):S?(0,b.jsx)(_,{className:`non-items`,children:(0,b.jsx)(m,{onClick:T})}):(0,b.jsxs)(_,{children:[(0,b.jsx)(`div`,{className:`collection-wrapper`,children:C?.map((e,t)=>(0,b.jsx)(g,{grc721Collection:e,pin:e=>{a(e.packagePath)},unpin:e=>{o(e.packagePath)},exitsPinnedCollections:w,queryGRC721Balance:c,queryGRC721TokenUri:s,moveCollectionPage:u},t))}),(0,b.jsx)(`div`,{className:`manage-collection-button-wrapper`,children:(0,b.jsx)(m,{onClick:T})}),h&&(0,b.jsx)(`div`,{className:`loading-wrapper`,children:(0,b.jsx)(d,{})})]})},x.__docgenInfo={description:``,methods:[],displayName:`NFTCollections`,props:{collections:{required:!0,tsType:{name:`union`,raw:`GRC721CollectionModel[] | null | undefined`,elements:[{name:`Array`,elements:[{name:`GRC721CollectionModel`}],raw:`GRC721CollectionModel[]`},{name:`null`},{name:`undefined`}]},description:``},isFetchedCollections:{required:!0,tsType:{name:`boolean`},description:``},pinnedCollections:{required:!0,tsType:{name:`union`,raw:`string[] | null | undefined`,elements:[{name:`Array`,elements:[{name:`string`}],raw:`string[]`},{name:`null`},{name:`undefined`}]},description:``},isFetchedPinnedCollections:{required:!0,tsType:{name:`boolean`},description:``},pin:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(packagePath: string) => Promise<void>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`}],return:{name:`Promise`,elements:[{name:`void`}],raw:`Promise<void>`}}},description:``},unpin:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(packagePath: string) => Promise<void>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`}],return:{name:`Promise`,elements:[{name:`void`}],raw:`Promise<void>`}}},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},queryGRC721Balance:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<number | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]}],raw:`UseQueryResult<number | null>`}}},description:``},moveCollectionPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(collection: GRC721CollectionModel) => void`,signature:{arguments:[{type:{name:`GRC721CollectionModel`},name:`collection`}],return:{name:`void`}}},description:``},moveManageCollectionsPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),C,w,T;e((()=>{S(),C={title:`components/nft/NFTCollections`,component:x},w={args:{}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {}
}`,...w.parameters?.docs?.source}}},T=[`Default`]}))();export{w as Default,T as __namedExportsOrder,C as default};