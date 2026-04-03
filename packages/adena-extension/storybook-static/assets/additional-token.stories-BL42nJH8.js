import{j as t}from"./global-style-Be4sOX77.js";import{A as e}from"./index-COufhan9.js";import"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./index-CulhM7-u.js";import"./string-utils-Bff5ZSZ1.js";import"./client-utils-zr3RfGzN.js";import"./index-y5y07clE.js";import"./gte-LYzHDOB4.js";import"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./bignumber-B1z4pYDt.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-B3tmVslE.js";import"./index-jlviZXHb.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./additional-token-info-4d5iMnSu.js";import"./additional-token-select-box-DuguXEiF.js";import"./common-arrow-up-gray-kFpYaQkk.js";import"./additional-token-search-list-BSrOoFjc.js";import"./additional-token-path-input-DWZJrv3I.js";import"./additional-token-type-selector-SvgnClqU.js";const{action:n}=__STORYBOOK_MODULE_ACTIONS__,E={title:"components/manage-token/AdditionalToken",component:e},a=[{tokenId:"token1",name:"GnoSwap",symbol:"GNS",chainId:"test3",path:"gno.land/gnoswap",pathInfo:"gnoswap",decimals:6},{tokenId:"token2",name:"Gnoswim",symbol:"SWIM",chainId:"test3",path:"gno.land/gnoswim",pathInfo:"gnoswim",decimals:6},{tokenId:"token3",name:"Gnosmosi",symbol:"OSMO",chainId:"test3",path:"gno.land/gnosmo.",pathInfo:"gnosmo.",decimals:6},{tokenId:"token4",name:"Gnostu..",symbol:"GNOSTU",chainId:"test3",path:"o.land/gnostuck",pathInfo:"gnostuck",decimals:6}],o={args:{opened:!1,selected:!0,keyword:"",tokenInfos:a,selectedTokenInfo:{tokenId:"token1",name:"GnoSwap",symbol:"GNS",chainId:"test3",path:"gno.land/gnoswap",pathInfo:"gnoswap",decimals:6},onChangeKeyword:n("change keyword"),onClickOpenButton:n("click open button"),onClickListItem:n("click list item"),onClickBack:n("click back"),onClickCancel:n("click cancel"),onClickAdd:n("click add")},render:i=>t.jsx("div",{style:{height:"500px"},children:t.jsx(e,{...i})})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    opened: false,
    selected: true,
    keyword: '',
    tokenInfos,
    selectedTokenInfo: {
      tokenId: 'token1',
      name: 'GnoSwap',
      symbol: 'GNS',
      chainId: 'test3',
      path: 'gno.land/gnoswap',
      pathInfo: 'gnoswap',
      decimals: 6
    },
    onChangeKeyword: action('change keyword'),
    onClickOpenButton: action('click open button'),
    onClickListItem: action('click list item'),
    onClickBack: action('click back'),
    onClickCancel: action('click cancel'),
    onClickAdd: action('click add')
  },
  render: args => <div style={{
    height: '500px'
  }}>
      <AdditionalToken {...args} />
    </div>
}`,...o.parameters?.docs?.source}}};const K=["Default"];export{o as Default,K as __namedExportsOrder,E as default};
