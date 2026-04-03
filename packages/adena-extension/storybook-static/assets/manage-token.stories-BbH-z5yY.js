import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";import{n as u,t as d}from"./manage-token-list-BUYyBbqx.js";import{n as f,t as p}from"./manage-token-search-input-CXEVm4Ez.js";var m,h=e((()=>{c(),i(),t(),m=r.div`
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
`})),g,_,v=e((()=>{u(),s(),f(),h(),g=l(),_=({keyword:e,tokens:t,onClickClose:n,onClickAdded:r,onChangeKeyword:i,onToggleActiveItem:a})=>(0,g.jsxs)(m,{children:[(0,g.jsxs)(`div`,{className:`content-wrapper`,children:[(0,g.jsx)(`div`,{className:`input-wrapper`,children:(0,g.jsx)(p,{keyword:e,onClickAdded:r,onChangeKeyword:i})}),(0,g.jsx)(`div`,{className:`list-wrapper`,children:(0,g.jsx)(d,{tokens:t,onToggleActiveItem:a})})]}),(0,g.jsx)(`div`,{className:`close-wrapper`,children:(0,g.jsx)(`button`,{className:`close`,onClick:n,children:`Close`})})]}),_.__docgenInfo={description:``,methods:[],displayName:`ManageTokenSearch`,props:{keyword:{required:!0,tsType:{name:`string`},description:``},tokens:{required:!0,tsType:{name:`Array`,elements:[{name:`ManageTokenInfo`}],raw:`ManageTokenInfo[]`},description:``},onClickAdded:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onChangeKeyword:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(keyword: string) => void`,signature:{arguments:[{type:{name:`string`},name:`keyword`}],return:{name:`void`}}},description:``},onToggleActiveItem:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(tokenId: string, activated: boolean) => void`,signature:{arguments:[{type:{name:`string`},name:`tokenId`},{type:{name:`boolean`},name:`activated`}],return:{name:`void`}}},description:``}}}})),y,b,x,S,C;e((()=>{v(),{action:y}=__STORYBOOK_MODULE_ACTIONS__,b={title:`components/manage-token/ManageTokenSearch`,component:_},x=[{tokenId:`token1`,type:`token`,symbol:`GNOT`,logo:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,name:`Gno.land`,balance:{value:`240,255.241155`,denom:`GNOT`},main:!0,activated:!0},{tokenId:`token2`,type:`token`,symbol:`GNS`,logo:`https://avatars.githubusercontent.com/u/118414737?s=200&v=4`,name:`GnoSwap`,balance:{value:`252.844`,denom:`GNS`},activated:!0}],S={args:{tokens:x,keyword:``,onClickClose:y(`click close`),onChangeKeyword:y(`change keyword`),onClickAdded:y(`click add button`),onToggleActiveItem:y(`toggle item`)}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    tokens,
    keyword: '',
    onClickClose: action('click close'),
    onChangeKeyword: action('change keyword'),
    onClickAdded: action('click add button'),
    onToggleActiveItem: action('toggle item')
  }
}`,...S.parameters?.docs?.source}}},C=[`Default`]}))();export{S as Default,C as __namedExportsOrder,b as default};