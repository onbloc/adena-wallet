import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,c as n,g as r,rt as i,s as a,t as o}from"./iframe-BclzClxJ.js";import{l as s,s as c,t as l}from"./atoms-kch4SvDy.js";import{g as u,r as d}from"./approve-ledger-loading-BtJ73zaA.js";import{n as f,t as p}from"./add-custom-network-button-DhlelACk.js";import{n as m,t as h}from"./network-list-BQSK5fJU.js";var g,_,v,y,b=e((()=>{l(),a(),i(),t(),g=o(),_=r.div`
  ${n.flex({align:`flex-start`,justify:`flex-start`})};
  position: relative;
  width: 100%;
  margin-top: 13px;
  gap: 12px;
`,v=r(c)`
  ${n.flex({align:`flex-start`})}
  width: 100%;
  height: 60px;
`,y=()=>(0,g.jsx)(_,{children:Array.from({length:4},(e,t)=>(0,g.jsxs)(v,{children:[(0,g.jsx)(s,{width:`58px`,height:`10px`,radius:`24px`}),(0,g.jsx)(s,{width:`134px`,height:`10px`,radius:`24px`,margin:`10px 0px 0px`})]},t))}),y.__docgenInfo={description:``,methods:[],displayName:`LoadingChangeNetwork`}})),x,S=e((()=>{a(),t(),x=r.div`
  ${n.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;

  .content-wrapper {
    padding: 12px 20px;
    margin-bottom: 78px;

    .title {
      margin: 12px 0;
    }
  }
`})),C,w,T=e((()=>{d(),i(),f(),b(),m(),S(),C=o(),w=({loading:e,currentNetworkId:t,networkMetainfos:n,changeNetwork:r,moveAddPage:i,moveEditPage:a,moveBack:o})=>(0,C.jsxs)(x,{children:[(0,C.jsxs)(`div`,{className:`content-wrapper`,children:[(0,C.jsx)(`h4`,{className:`title`,children:`Change Network`}),e?(0,C.jsx)(y,{}):(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(h,{currentNetworkId:t,networkMetainfos:n,changeNetwork:r,moveEditPage:a}),(0,C.jsx)(p,{onClick:i})]})]}),(0,C.jsx)(u,{onClick:o})]}),w.__docgenInfo={description:``,methods:[],displayName:`ChangeNetwork`,props:{loading:{required:!0,tsType:{name:`boolean`},description:``},currentNetworkId:{required:!0,tsType:{name:`string`},description:``},networkMetainfos:{required:!0,tsType:{name:`Array`,elements:[{name:`NetworkMetainfo`}],raw:`NetworkMetainfo[]`},description:``},changeNetwork:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(networkMetainfoId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`networkMetainfoId`}],return:{name:`void`}}},description:``},moveAddPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},moveEditPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(networkMetainfoId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`networkMetainfoId`}],return:{name:`void`}}},description:``},moveBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),E,D,O,k;e((()=>{T(),{action:E}=__STORYBOOK_MODULE_ACTIONS__,D={title:`components/change-network/ChangeNetwork`,component:w},O={args:{loading:!1,currentNetworkId:`test3`,networkMetainfos:[{id:`test3`,default:!0,main:!0,chainId:`chainId`,chainName:`Gno.land`,networkId:`test3`,networkName:`Testnet 3`,addressPrefix:`g`,rpcUrl:`https://rpc.test3.Gno.land`,indexerUrl:``,gnoUrl:`https://test3.gno.land`,apiUrl:`https://api.adena.app`,linkUrl:`https://gnoscan.io`},{id:`test2`,default:!0,main:!0,chainId:`chainId`,chainName:`Gno.land`,networkId:`test2`,networkName:`Testnet 2`,addressPrefix:`g`,rpcUrl:`https://rpc.test3.gno.land`,indexerUrl:``,gnoUrl:`https://test3.gno.land`,apiUrl:`https://api.adena.app`,linkUrl:`https://gnoscan.io`}],changeNetwork:E(`changeNetwork`),moveAddPage:E(`moveAddPage`),moveEditPage:E(`moveEditPage`),moveBack:E(`moveBack`)}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    loading: false,
    currentNetworkId: 'test3',
    networkMetainfos: [{
      id: 'test3',
      default: true,
      main: true,
      chainId: 'chainId',
      chainName: 'Gno.land',
      networkId: 'test3',
      networkName: 'Testnet 3',
      addressPrefix: 'g',
      rpcUrl: 'https://rpc.test3.Gno.land',
      indexerUrl: '',
      gnoUrl: 'https://test3.gno.land',
      apiUrl: 'https://api.adena.app',
      linkUrl: 'https://gnoscan.io'
    }, {
      id: 'test2',
      default: true,
      main: true,
      chainId: 'chainId',
      chainName: 'Gno.land',
      networkId: 'test2',
      networkName: 'Testnet 2',
      addressPrefix: 'g',
      rpcUrl: 'https://rpc.test3.gno.land',
      indexerUrl: '',
      gnoUrl: 'https://test3.gno.land',
      apiUrl: 'https://api.adena.app',
      linkUrl: 'https://gnoscan.io'
    }],
    changeNetwork: action('changeNetwork'),
    moveAddPage: action('moveAddPage'),
    moveEditPage: action('moveEditPage'),
    moveBack: action('moveBack')
  }
}`,...O.parameters?.docs?.source}}},k=[`Default`]}))();export{O as Default,k as __namedExportsOrder,D as default};