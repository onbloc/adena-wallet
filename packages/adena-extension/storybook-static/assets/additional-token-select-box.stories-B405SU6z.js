import{n as e}from"./chunk-zsgVPwQN.js";import{n as t,t as n}from"./additional-token-select-box-BeZTRAD4.js";var r,i,a,o,s,c,l,u,d;e((()=>{t(),{action:r}=__STORYBOOK_MODULE_ACTIONS__,i={title:`components/manage-token/AdditionalTokenSelectBox`,component:n},a=[{tokenId:`token1`,name:`GnoSwap`,symbol:`GNS`,chainId:`test3`,path:`gno.land/gnoswap`,pathInfo:`gnoswap`,decimals:6},{tokenId:`token2`,name:`Gnoswim`,symbol:`SWIM`,chainId:`test3`,path:`gno.land/gnoswim`,pathInfo:`gnoswim`,decimals:6},{tokenId:`token3`,name:`Gnosmosi`,symbol:`OSMO`,chainId:`test3`,path:`gno.land/gnosmo...`,pathInfo:`gnosmo...`,decimals:6},{tokenId:`token4`,name:`Gnostu`,symbol:`GNOSTU`,chainId:`test3`,path:`gno.land/gnostuck`,pathInfo:`gnostuck`,decimals:6}],o={args:{selected:!1,selectedInfo:{name:`GnoSwap`,symbol:`GNS`},opened:!1,tokenInfos:a,keyword:``,onChangeKeyword:r(`change keyword`),onClickListItem:r(`click list item`),onClickOpenButton:r(`click open button`)}},s={args:{selected:!0,selectedInfo:{name:`GnoSwap`,symbol:`GNS`},opened:!1,tokenInfos:a,keyword:``,onChangeKeyword:r(`change keyword`),onClickListItem:r(`click list item`),onClickOpenButton:r(`click open button`)}},c={args:{selected:!0,selectedInfo:{name:`GnoSwap`,symbol:`GNS`},opened:!0,tokenInfos:a,keyword:``,onChangeKeyword:r(`change keyword`),onClickListItem:r(`click list item`),onClickOpenButton:r(`click open button`)}},l={args:{selected:!1,selectedInfo:{name:`GnoSwap`,symbol:`GNS`},opened:!0,tokenInfos:a,keyword:``,onChangeKeyword:r(`change keyword`),onClickListItem:r(`click list item`),onClickOpenButton:r(`click open button`)}},u={args:{selected:!1,selectedInfo:{name:`GnoSwap`,symbol:`GNS`},opened:!0,tokenInfos:a,keyword:`Gno`,onChangeKeyword:r(`change keyword`),onClickListItem:r(`click list item`),onClickOpenButton:r(`click open button`)}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
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
}`,...u.parameters?.docs?.source}}},d=[`Default`,`SelectedAndClosed`,`SelectedAndOpened`,`Opened`,`OpenedAndKeyword`]}))();export{o as Default,l as Opened,u as OpenedAndKeyword,s as SelectedAndClosed,c as SelectedAndOpened,d as __namedExportsOrder,i as default};