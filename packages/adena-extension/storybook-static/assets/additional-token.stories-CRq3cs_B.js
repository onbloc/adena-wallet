import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-DekVl-_p.js";import{t as d}from"./atoms-DPNcwsZr.js";import{a as f,o as p,t as m}from"./sub-header-nxmxIm98.js";import{r as h,t as g}from"./string-utils-CW3p0bnP.js";import{n as _,t as v}from"./additional-token-info-BatT30mx.js";import{n as y,t as b}from"./additional-token-path-input-C9npKQQR.js";import{n as x,t as S}from"./additional-token-select-box-DxefaGFR.js";import{n as C,r as w,t as T}from"./additional-token-type-selector-NrnKIRgM.js";var E,D=t((()=>{l(),a(),n(),E=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 444px;

  .sub-header-container {
    margin-top: 5px;
    margin-bottom: 24px;
  }

  .type-selector-wrapper {
    display: flex;
    width: 100%;
    margin-bottom: 12px;
  }

  .select-box-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .info-wrapper {
    display: flex;
    height: 100%;
    overflow-y: auto;
  }

  .button-group {
    ${r.flex({direction:`row`,align:`normal`,justify:`space-between`})};
    position: absolute;
    width: 100%;
    bottom: 0;

    button {
      display: inline-flex;
      width: 100%;
      height: 48px;
      border-radius: 30px;
      align-items: center;
      justify-content: center;
      ${o.body1Bold}
      transition: 0.2s;

      &:last-child {
        margin-left: 12px;
      }

      &.cancel-button {
        background-color: ${s(`neutral`,`_5`)};

        &:hover {
          background-color: ${s(`neutral`,`_6`)};
        }
      }

      &.add-button {
        background-color: ${s(`primary`,`_6`)};

        &:hover {
          background-color: ${s(`primary`,`_7`)};
        }

        &.disabled {
          color: ${s(`neutral`,`_5`)};
          background-color: ${s(`primary`,`_9`)};
          cursor: default;
        }
      }
    }
  }
`})),O,k,A,j=t((()=>{p(),g(),d(),_(),x(),O=e(c()),y(),w(),D(),k=u(),A=({opened:e,selected:t,addingType:n,keyword:r,manualTokenPath:i,tokenInfos:a,selectedTokenPath:o,selectedTokenInfo:s,isLoadingManualGRC20Token:c,isLoadingSelectedGRC20Token:l,errorManualGRC20Token:u,selectAddingType:d,onChangeKeyword:p,onChangeManualTokenPath:g,onClickOpenButton:_,onClickListItem:y,onClickBack:x,onClickCancel:w,onClickAdd:D})=>{let A=(0,O.useMemo)(()=>n===T.SEARCH,[n]),j=(0,O.useMemo)(()=>A?l:c,[n,c,l]),M=(0,O.useMemo)(()=>u?u.message:null,[u]),N=(0,O.useMemo)(()=>s&&!u,[s,u]),P=(0,O.useMemo)(()=>{let e=a.find(e=>e.path===o);return e?{name:e.name,symbol:e.symbol}:null},[o,a]);return(0,k.jsxs)(E,{children:[(0,k.jsx)(`div`,{className:`sub-header-container`,children:(0,k.jsx)(m,{title:`Add Custom Token`,leftElement:{element:(0,k.jsx)(`img`,{src:f,alt:`back icon`}),onClick:x}})}),(0,k.jsx)(`div`,{className:`type-selector-wrapper`,children:(0,k.jsx)(C,{type:n,setType:d})}),(0,k.jsx)(`div`,{className:`select-box-wrapper`,children:A?(0,k.jsx)(S,{opened:e,selected:t,keyword:r,tokenInfos:a,selectedInfo:P||null,onChangeKeyword:p,onClickOpenButton:_,onClickListItem:y}):(0,k.jsx)(b,{keyword:i,onChangeKeyword:g,errorMessage:M})}),(0,k.jsx)(`div`,{className:`info-wrapper`,children:(0,k.jsx)(v,{isLoading:j,symbol:s?.symbol||``,path:h(s?.pathInfo||``),decimals:s?`${s.decimals}`:``})}),(0,k.jsxs)(`div`,{className:`button-group`,children:[(0,k.jsx)(`button`,{className:`cancel-button`,onClick:w,children:`Cancel`}),(0,k.jsx)(`button`,{className:N?`add-button`:`add-button disabled`,onClick:D,children:`Add`})]})]})},A.__docgenInfo={description:``,methods:[],displayName:`AdditionalToken`}})),M,N,P,F,I,L;t((()=>{c(),j(),M=u(),{action:N}=__STORYBOOK_MODULE_ACTIONS__,P={title:`components/manage-token/AdditionalToken`,component:A},F=[{tokenId:`token1`,name:`GnoSwap`,symbol:`GNS`,chainId:`test3`,path:`gno.land/gnoswap`,pathInfo:`gnoswap`,decimals:6},{tokenId:`token2`,name:`Gnoswim`,symbol:`SWIM`,chainId:`test3`,path:`gno.land/gnoswim`,pathInfo:`gnoswim`,decimals:6},{tokenId:`token3`,name:`Gnosmosi`,symbol:`OSMO`,chainId:`test3`,path:`gno.land/gnosmo.`,pathInfo:`gnosmo.`,decimals:6},{tokenId:`token4`,name:`Gnostu..`,symbol:`GNOSTU`,chainId:`test3`,path:`o.land/gnostuck`,pathInfo:`gnostuck`,decimals:6}],I={args:{opened:!1,selected:!0,keyword:``,tokenInfos:F,selectedTokenInfo:{tokenId:`token1`,name:`GnoSwap`,symbol:`GNS`,chainId:`test3`,path:`gno.land/gnoswap`,pathInfo:`gnoswap`,decimals:6},onChangeKeyword:N(`change keyword`),onClickOpenButton:N(`click open button`),onClickListItem:N(`click list item`),onClickBack:N(`click back`),onClickCancel:N(`click cancel`),onClickAdd:N(`click add`)},render:e=>(0,M.jsx)(`div`,{style:{height:`500px`},children:(0,M.jsx)(A,{...e})})},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
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
}`,...I.parameters?.docs?.source}}},L=[`Default`]}))();export{I as Default,L as __namedExportsOrder,P as default};