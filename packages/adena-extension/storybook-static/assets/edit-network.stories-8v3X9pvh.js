import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,rt as a,s as o,t as s}from"./iframe-BclzClxJ.js";import{t as c}from"./custom-network-input-BunuE47j.js";import{t as l}from"./atoms-kch4SvDy.js";import{a as u,o as d,t as f}from"./sub-header-CtopHkw-.js";import{h as p,r as m}from"./approve-ledger-loading-BtJ73zaA.js";import{n as h,t as g}from"./remove-network-button-CTVIWzUb.js";var _,v=e((()=>{o(),n(),_=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: 100vh;

  & .content-wrapper {
    ${r.flex({align:`normal`,justify:`normal`})};
    width: 100%;
    height: 100%;
    padding: 24px 20px 72px 20px;
  }

  & .form-wrapper {
    ${r.flex({align:`normal`,justify:`normal`})};
    width: 100%;
    height: 100%;
    padding: 12px 0;
  }
`})),y,b,x,S=e((()=>{d(),l(),m(),y=t(a()),h(),v(),b=s(),x=({name:e,rpcUrl:t,indexerUrl:n,chainId:r,rpcUrlError:i,indexerUrlError:a,chainIdError:o,savable:s,editType:l,changeName:d,changeRPCUrl:m,changeIndexerUrl:h,changeChainId:v,moveBack:x,saveNetwork:S,clearNetwork:C})=>{let w=(0,y.useMemo)(()=>l===`all`?`Remove Network`:`Reset to Default`,[l]),T=(0,y.useCallback)(()=>{x()},[x]),E=(0,y.useCallback)(()=>{s&&S()},[s,S]),D=(0,y.useCallback)(()=>{C()},[C]);return(0,b.jsxs)(_,{children:[(0,b.jsxs)(`div`,{className:`content-wrapper`,children:[(0,b.jsx)(f,{title:`Edit Network`,leftElement:{element:(0,b.jsx)(`img`,{src:u,alt:`back icon`}),onClick:T}}),(0,b.jsx)(`div`,{className:`form-wrapper`,children:(0,b.jsx)(c,{name:e,rpcUrl:t,indexerUrl:n,chainId:r,rpcUrlError:i,indexerUrlError:a,chainIdError:o,changeName:d,changeRPCUrl:m,changeIndexerUrl:h,changeChainId:v,editType:l})}),(0,b.jsx)(g,{text:w,clearNetwork:D})]}),(0,b.jsx)(p,{leftButton:{text:`Cancel`,onClick:T},rightButton:{primary:!0,disabled:!s,text:`Save`,onClick:E}})]})},x.__docgenInfo={description:``,methods:[],displayName:`EditNetwork`,props:{name:{required:!0,tsType:{name:`string`},description:``},rpcUrl:{required:!0,tsType:{name:`string`},description:``},rpcUrlError:{required:!1,tsType:{name:`string`},description:``},indexerUrl:{required:!0,tsType:{name:`string`},description:``},indexerUrlError:{required:!1,tsType:{name:`string`},description:``},chainIdError:{required:!1,tsType:{name:`string`},description:``},chainId:{required:!0,tsType:{name:`string`},description:``},savable:{required:!0,tsType:{name:`boolean`},description:``},editType:{required:!0,tsType:{name:`union`,raw:`'rpc-only' | 'all-default' | 'all'`,elements:[{name:`literal`,value:`'rpc-only'`},{name:`literal`,value:`'all-default'`},{name:`literal`,value:`'all'`}]},description:``},changeName:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(name: string) => void`,signature:{arguments:[{type:{name:`string`},name:`name`}],return:{name:`void`}}},description:``},changeRPCUrl:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(rpcUrl: string) => void`,signature:{arguments:[{type:{name:`string`},name:`rpcUrl`}],return:{name:`void`}}},description:``},changeIndexerUrl:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(indexerUrl: string) => void`,signature:{arguments:[{type:{name:`string`},name:`indexerUrl`}],return:{name:`void`}}},description:``},changeChainId:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(chainId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`chainId`}],return:{name:`void`}}},description:``},clearNetwork:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},saveNetwork:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},moveBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),C,w,T,E;e((()=>{S(),{action:C}=__STORYBOOK_MODULE_ACTIONS__,w={title:`components/edit-network/EditNetwork`,component:x},T={args:{name:``,rpcUrl:``,chainId:``,rpcUrlError:``,savable:!1,changeName:C(`onChangeName`),changeRPCUrl:C(`onChangeRPCUrl`),changeChainId:C(`onChangeChainId`),clearNetwork:C(`clearNetwork`),saveNetwork:C(`saveNetwork`),moveBack:C(`moveBack`)}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    name: '',
    rpcUrl: '',
    chainId: '',
    rpcUrlError: '',
    savable: false,
    changeName: action('onChangeName'),
    changeRPCUrl: action('onChangeRPCUrl'),
    changeChainId: action('onChangeChainId'),
    clearNetwork: action('clearNetwork'),
    saveNetwork: action('saveNetwork'),
    moveBack: action('moveBack')
  }
}`,...T.parameters?.docs?.source}}},E=[`Default`]}))();export{T as Default,E as __namedExportsOrder,w as default};