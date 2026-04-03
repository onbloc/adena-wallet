import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,b as r,c as i,g as a,rt as o,s,t as c}from"./iframe-DekVl-_p.js";import{h as l,t as u}from"./atoms-DPNcwsZr.js";import{t as d}from"./sub-header-nxmxIm98.js";import{m as f,r as p}from"./approve-ledger-loading-BquluU52.js";import{n as m,t as h}from"./approve-changing-network-item-CZUrnv64.js";var g,_=t((()=>{g=`data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%3e%3cpath%20d='M8%2020L17%2012L8%204'%20stroke='white'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'/%3e%3c/svg%3e`})),v,y=t((()=>{s(),n(),v=a.div`
  ${i.flex()};
  width: 100%;
  height: auto;
  justify-content: center;
  align-items: center;
  padding: 24px 20px;

  .title-container {
    ${i.flex({align:`normal`,justify:`normal`})};
    width: 100%;
    height: 152px;
    margin-bottom: 16px;

    h4 {
      display: block;
      max-width: 100%;
      text-align: center;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      word-break: break-all;
    }

    .description-wrapper {
      display: flex;
      width: 100%;
      margin: 12px auto 0 auto;
      justify-content: center;
    }
  }

  .info-wrapper {
    ${i.flex({direction:`row`,align:`flex-start`,justify:`normal`})};
    width: fit-content;

    .icon-arrow {
      width: 24px;
      height: 24px;
      margin: 28px;
    }
  }
`})),b,x,S,C=t((()=>{_(),u(),p(),b=e(o()),n(),m(),y(),x=c(),S=({fromChain:e,toChain:t,changeable:n,processing:i,done:a,changeNetwork:o,cancel:s,onResponse:c})=>{let u=(0,b.useMemo)(()=>`Switch to ${t.name}`,[t.name]),p=r(),m=(0,b.useCallback)(()=>{s()},[s]),_=(0,b.useCallback)(()=>{n&&o()},[n,o]);return(0,b.useEffect)(()=>{a&&c()},[a,c]),(0,x.jsxs)(v,{children:[(0,x.jsxs)(`div`,{className:`title-container`,children:[(0,x.jsx)(d,{title:u}),(0,x.jsx)(`div`,{className:`description-wrapper`,children:(0,x.jsx)(l,{type:`body1Reg`,color:p.neutral.a,textAlign:`center`,children:`This will switch the current network on
Adena to the one that matches the
connected dapp.`})})]}),(0,x.jsxs)(`div`,{className:`info-wrapper`,children:[(0,x.jsx)(h,{...e}),(0,x.jsx)(`img`,{className:`icon-arrow`,src:g,alt:`arrow`}),(0,x.jsx)(h,{...t})]}),(0,x.jsx)(f,{leftButton:{text:`Cancel`,onClick:m},rightButton:{primary:!0,loading:i,disabled:n===!1,text:`Switch`,onClick:_}})]})},S.__docgenInfo={description:``,methods:[],displayName:`ApproveChangingNetwork`,props:{fromChain:{required:!0,tsType:{name:`ChangingNetworkInfo`},description:``},toChain:{required:!0,tsType:{name:`ChangingNetworkInfo`},description:``},changeable:{required:!0,tsType:{name:`boolean`},description:``},processing:{required:!0,tsType:{name:`boolean`},description:``},done:{required:!0,tsType:{name:`boolean`},description:``},changeNetwork:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},cancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onResponse:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onTimeout:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),w,T,E,D;t((()=>{C(),{action:w}=__STORYBOOK_MODULE_ACTIONS__,T={title:`components/approve-changing-network/ApproveChangingNetwork`,component:S},E={args:{fromChain:{name:`Testnet3`},toChain:{name:`Onbloc Testnet`},changeable:!0,processing:!1,done:!1,changeNetwork:w(`changeNetwork`),cancel:w(`cancel`),onResponse:w(`onResponse`),onTimeout:w(`onTimeout`)}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    fromChain: {
      name: 'Testnet3'
    },
    toChain: {
      name: 'Onbloc Testnet'
    },
    changeable: true,
    processing: false,
    done: false,
    changeNetwork: action('changeNetwork'),
    cancel: action('cancel'),
    onResponse: action('onResponse'),
    onTimeout: action('onTimeout')
  }
}`,...E.parameters?.docs?.source}}},D=[`Default`]}))();export{E as Default,D as __namedExportsOrder,T as default};