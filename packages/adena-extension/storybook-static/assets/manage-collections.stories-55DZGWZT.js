import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-BclzClxJ.js";import{n as u,t as d}from"./manage-token-list-DKxGIJCz.js";import{n as f,t as p}from"./manage-collection-search-input-CJ1t6vNl.js";var m,h=e((()=>{c(),i(),t(),m=r.div`
  ${n.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;

  .list-wrapper {
    display: flex;
    margin-top: 24px;
    max-height: 284px;
    overflow-y: auto;
    padding-bottom: 24px;
  }

  .close-wrapper {
    position: absolute;
    display: flex;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 96px;
    padding: 24px 20px;
    box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);

    .close {
      width: 100%;
      height: 100%;
      background-color: ${o(`neutral`,`_5`)};
      border-radius: 30px;
      ${a.body1Bold};
      transition: 0.2s;

      &:hover {
        background-color: ${o(`neutral`,`_6`)};
      }
    }
  }
`})),g,_,v=e((()=>{u(),s(),f(),h(),g=l(),_=({keyword:e,collections:t,queryGRC721TokenUri:n,queryGRC721Balance:r,onClickClose:i,onChangeKeyword:a,onToggleActiveItem:o})=>(0,g.jsxs)(m,{children:[(0,g.jsxs)(`div`,{className:`content-wrapper`,children:[(0,g.jsx)(`div`,{className:`input-wrapper`,children:(0,g.jsx)(p,{keyword:e,onChangeKeyword:a})}),(0,g.jsx)(`div`,{className:`list-wrapper`,children:(0,g.jsx)(d,{tokens:t,queryGRC721TokenUri:n,queryGRC721Balance:r,onToggleActiveItem:o})})]}),(0,g.jsx)(`div`,{className:`close-wrapper`,children:(0,g.jsx)(`button`,{className:`close`,onClick:i,children:`Close`})})]}),_.__docgenInfo={description:``,methods:[],displayName:`ManageCollections`,props:{keyword:{required:!0,tsType:{name:`string`},description:``},collections:{required:!0,tsType:{name:`Array`,elements:[{name:`ManageGRC721Info`}],raw:`ManageGRC721Info[]`},description:``},onClickClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},queryGRC721Balance:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<number | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]}],raw:`UseQueryResult<number | null>`}}},description:``},onChangeKeyword:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(keyword: string) => void`,signature:{arguments:[{type:{name:`string`},name:`keyword`}],return:{name:`void`}}},description:``},onToggleActiveItem:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(tokenId: string, activated: boolean) => void`,signature:{arguments:[{type:{name:`string`},name:`tokenId`},{type:{name:`boolean`},name:`activated`}],return:{name:`void`}}},description:``}}}})),y,b,x,S;e((()=>{v(),{action:y}=__STORYBOOK_MODULE_ACTIONS__,b={title:`components/manage-nft/ManageCollections`,component:_},x={args:{collections:[],keyword:``,onClickClose:y(`click close`),onChangeKeyword:y(`change keyword`),onToggleActiveItem:y(`toggle item`)}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    collections: [],
    keyword: '',
    onClickClose: action('click close'),
    onChangeKeyword: action('change keyword'),
    onToggleActiveItem: action('toggle item')
  }
}`,...x.parameters?.docs?.source}}},S=[`Default`]}))();export{x as Default,S as __namedExportsOrder,b as default};