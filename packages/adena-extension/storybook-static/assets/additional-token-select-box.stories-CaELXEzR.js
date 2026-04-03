import{A as r}from"./additional-token-select-box-DuguXEiF.js";import"./global-style-Be4sOX77.js";import"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./common-arrow-up-gray-kFpYaQkk.js";import"./index-Ct-w3XHB.js";import"./index-CulhM7-u.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./bignumber-B1z4pYDt.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-B3tmVslE.js";import"./index-jlviZXHb.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./additional-token-search-list-BSrOoFjc.js";import"./string-utils-Bff5ZSZ1.js";import"./client-utils-zr3RfGzN.js";import"./index-y5y07clE.js";import"./gte-LYzHDOB4.js";const{action:e}=__STORYBOOK_MODULE_ACTIONS__,x={title:"components/manage-token/AdditionalTokenSelectBox",component:r},n=[{tokenId:"token1",name:"GnoSwap",symbol:"GNS",chainId:"test3",path:"gno.land/gnoswap",pathInfo:"gnoswap",decimals:6},{tokenId:"token2",name:"Gnoswim",symbol:"SWIM",chainId:"test3",path:"gno.land/gnoswim",pathInfo:"gnoswim",decimals:6},{tokenId:"token3",name:"Gnosmosi",symbol:"OSMO",chainId:"test3",path:"gno.land/gnosmo...",pathInfo:"gnosmo...",decimals:6},{tokenId:"token4",name:"Gnostu",symbol:"GNOSTU",chainId:"test3",path:"gno.land/gnostuck",pathInfo:"gnostuck",decimals:6}],o={args:{selected:!1,selectedInfo:{name:"GnoSwap",symbol:"GNS"},opened:!1,tokenInfos:n,keyword:"",onChangeKeyword:e("change keyword"),onClickListItem:e("click list item"),onClickOpenButton:e("click open button")}},t={args:{selected:!0,selectedInfo:{name:"GnoSwap",symbol:"GNS"},opened:!1,tokenInfos:n,keyword:"",onChangeKeyword:e("change keyword"),onClickListItem:e("click list item"),onClickOpenButton:e("click open button")}},c={args:{selected:!0,selectedInfo:{name:"GnoSwap",symbol:"GNS"},opened:!0,tokenInfos:n,keyword:"",onChangeKeyword:e("change keyword"),onClickListItem:e("click list item"),onClickOpenButton:e("click open button")}},s={args:{selected:!1,selectedInfo:{name:"GnoSwap",symbol:"GNS"},opened:!0,tokenInfos:n,keyword:"",onChangeKeyword:e("change keyword"),onClickListItem:e("click list item"),onClickOpenButton:e("click open button")}},a={args:{selected:!1,selectedInfo:{name:"GnoSwap",symbol:"GNS"},opened:!0,tokenInfos:n,keyword:"Gno",onChangeKeyword:e("change keyword"),onClickListItem:e("click list item"),onClickOpenButton:e("click open button")}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    selected: false,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS'
    },
    opened: false,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  }
}`,...o.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS'
    },
    opened: false,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  }
}`,...t.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS'
    },
    opened: true,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  }
}`,...c.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    selected: false,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS'
    },
    opened: true,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  }
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    selected: false,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS'
    },
    opened: true,
    tokenInfos,
    keyword: 'Gno',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  }
}`,...a.parameters?.docs?.source}}};const D=["Default","SelectedAndClosed","SelectedAndOpened","Opened","OpenedAndKeyword"];export{o as Default,s as Opened,a as OpenedAndKeyword,t as SelectedAndClosed,c as SelectedAndOpened,D as __namedExportsOrder,x as default};
