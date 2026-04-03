import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";import{t as d}from"./atoms-kch4SvDy.js";import{a as f,o as p,t as m}from"./sub-header-CtopHkw-.js";import{E as h,T as g,h as _,r as v}from"./approve-ledger-loading-BtJ73zaA.js";import{n as y,t as b}from"./transfer-arrow-down-M3aQUr9b.js";import{n as x,t as S}from"./transfer-summary-address-CpOfMikl.js";import{n as C,t as w}from"./transfer-summary-balance-D-QInKmM.js";var T,E=e((()=>{l(),a(),n(),T=i.div`
  ${r.flex({align:`normal`,justify:`flex-start`})};
  position: relative;
  padding: 24px 20px 0;
  width: 100%;
  height: 100%;
  min-height: 444px;
  align-items: center;

  .sub-header-wrapper {
    width: 100%;
  }

  .info-wrapper {
    width: 100%;
    margin-top: 25px;
  }

  .direction-icon-wrapper {
    width: 100%;
    text-align: center;
    margin: 10px 0;
  }

  .network-fee-wrapper {
    width: 100%;
    margin-top: 20px;

    .error-message {
      position: relative;
      width: 100%;
      padding: 0 16px;
      ${o.captionReg};
      font-size: 13px;
      color: ${s(`red`,`_5`)};
    }
  }

  .simulate-error-banner {
    width: 100%;
    padding: 10px 16px;
    border-radius: 18px;
    background-color: rgba(239, 45, 33, 0.08);
    border: 1px solid ${s(`red`,`_5`)};
    margin-top: 8px;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    font-size: 13px;
    line-height: 20px;
    color: ${s(`red`,`_5`)};
    word-break: break-word;
    overflow-wrap: break-word;

    .error-label {
      font-weight: 700;
    }
  }

  .bottom-spacer {
    width: 100%;
    height: 116px;
    flex-shrink: 0;
  }
`})),D,O,k,A=e((()=>{p(),b(),d(),v(),h(),D=t(c()),x(),C(),E(),O=u(),k=({tokenMetainfo:e,tokenImage:t,transferBalance:n,toAddress:r,networkFee:i,memo:a,useNetworkFeeReturn:o,isErrorNetworkFee:s,simulateErrorBannerMessage:c,onClickBack:l,onClickCancel:u,onClickSend:d,onClickNetworkFeeSetting:p})=>{let h=(0,D.useMemo)(()=>o.isLoading||s||o.isSimulateError?!0:Number(i?.amount||0)<=0,[s,o.isLoading,o.isSimulateError,i]),v=(0,D.useMemo)(()=>s?`Insufficient network fee`:``,[s]);return(0,O.jsxs)(T,{children:[(0,O.jsx)(`div`,{className:`sub-header-wrapper`,children:(0,O.jsx)(m,{leftElement:{element:(0,O.jsx)(`img`,{src:`${f}`,alt:`back image`}),onClick:l},title:`Sending ${e.symbol}`})}),(0,O.jsxs)(`div`,{className:`info-wrapper`,children:[(0,O.jsx)(w,{tokenImage:t,value:n.value,denom:n.denom}),(0,O.jsx)(`div`,{className:`direction-icon-wrapper`,children:(0,O.jsx)(`img`,{src:`${y}`,alt:`direction-icon`})}),(0,O.jsx)(S,{toAddress:r,memo:a})]}),(0,O.jsx)(`div`,{className:`network-fee-wrapper`,children:(0,O.jsx)(g,{value:i?.amount||``,denom:i?.denom||``,isError:s,isLoading:o.isLoading,errorMessage:v,onClickSetting:p})}),c&&(0,O.jsxs)(`div`,{className:`simulate-error-banner`,children:[(0,O.jsx)(`span`,{className:`error-label`,children:`ERROR:\xA0`}),(0,O.jsx)(`span`,{className:`error-text`,children:c})]}),(0,O.jsx)(`div`,{className:`bottom-spacer`}),(0,O.jsx)(_,{filled:!0,leftButton:{text:`Cancel`,onClick:u},rightButton:{text:`Send`,primary:!0,onClick:d,disabled:h}})]})},k.__docgenInfo={description:``,methods:[],displayName:`TransferSummary`,props:{tokenMetainfo:{required:!0,tsType:{name:`TokenModel`},description:``},tokenImage:{required:!0,tsType:{name:`string`},description:``},transferBalance:{required:!0,tsType:{name:`Amount`},description:``},toAddress:{required:!0,tsType:{name:`string`},description:``},networkFee:{required:!0,tsType:{name:`union`,raw:`NetworkFeeType | null`,elements:[{name:`NetworkFeeType`},{name:`null`}]},description:``},memo:{required:!0,tsType:{name:`string`},description:``},currentBalance:{required:!0,tsType:{name:`union`,raw:`number | null | undefined`,elements:[{name:`number`},{name:`null`},{name:`undefined`}]},description:``},useNetworkFeeReturn:{required:!0,tsType:{name:`UseNetworkFeeReturn`},description:``},isErrorNetworkFee:{required:!1,tsType:{name:`boolean`},description:``},isLoadingNetworkFee:{required:!1,tsType:{name:`boolean`},description:``},simulateErrorBannerMessage:{required:!1,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``},onClickBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickSend:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickNetworkFeeSetting:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),j,M,N,P,F;e((()=>{A(),j=u(),{action:M}=__STORYBOOK_MODULE_ACTIONS__,N={title:`components/transfer/TransferSummary`,component:k},P={args:{isErrorNetworkFee:!1,tokenMetainfo:{main:!0,display:!1,tokenId:`tokenId`,networkId:`DEFAULT`,name:`Gno.land`,image:``,symbol:`GNOT`,type:`gno-native`,decimals:6},tokenImage:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,transferBalance:{value:`4,000.123`,denom:`GNOT`},toAddress:`g1fnakf9vrd6uqn8qdmp88yac4p0ngy572answ9f`,networkFee:{amount:`0.0048`,denom:`GNOT`},onClickBack:M(`click back`),onClickCancel:M(`click cancel`),onClickSend:M(`click send`)},render:e=>(0,j.jsx)(`div`,{style:{height:`500px`},children:(0,j.jsx)(k,{...e})})},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    isErrorNetworkFee: false,
    tokenMetainfo: {
      main: true,
      display: false,
      tokenId: 'tokenId',
      networkId: 'DEFAULT',
      name: 'Gno.land',
      image: '',
      symbol: 'GNOT',
      type: 'gno-native',
      decimals: 6
    },
    tokenImage: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    transferBalance: {
      value: '4,000.123',
      denom: 'GNOT'
    },
    toAddress: 'g1fnakf9vrd6uqn8qdmp88yac4p0ngy572answ9f',
    networkFee: {
      amount: '0.0048',
      denom: 'GNOT'
    },
    onClickBack: action('click back'),
    onClickCancel: action('click cancel'),
    onClickSend: action('click send')
  },
  render: args => <div style={{
    height: '500px'
  }}>
      <TransferSummary {...args} />
    </div>
}`,...P.parameters?.docs?.source}}},F=[`Default`]}))();export{P as Default,F as __namedExportsOrder,N as default};