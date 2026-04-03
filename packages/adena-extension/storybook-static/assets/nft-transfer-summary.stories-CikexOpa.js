import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";import{t as d}from"./atoms-kch4SvDy.js";import{a as f,o as p,t as m}from"./sub-header-CtopHkw-.js";import{E as h,T as g,h as _,r as v}from"./approve-ledger-loading-BtJ73zaA.js";import{n as y,t as b}from"./nft-asset-image-card-DL4lJBU8.js";import{n as x,t as S}from"./base-DMhciFYi.js";import{n as C,t as w}from"./transfer-arrow-down-M3aQUr9b.js";import{n as T,t as E}from"./transfer-summary-address-CpOfMikl.js";var D,O,k=e((()=>{S(),D={MEMO_TOO_LARGE_ERROR:{status:1e3,type:`MEMO_TOO_LARGE_ERROR`,message:`Memo too large`},INSUFFICIENT_NETWORK_FEE:{status:1001,type:`INSUFFICIENT_NETWORK_FEE`,message:`Insufficient network fee`}},O=class e extends x{constructor(t){super(D[t]),Object.setPrototypeOf(this,e.prototype)}}})),A,j=e((()=>{l(),a(),n(),A=i.div`
  ${r.flex({align:`normal`,justify:`flex-start`})};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: auto;
  align-items: center;

  .sub-header-wrapper {
    width: 100%;
  }

  .info-wrapper {
    width: 100%;
    margin-top: 25px;

    .asset-card-wrapper {
      width: 100px;
      margin: 0 auto;
    }
  }

  .direction-icon-wrapper {
    width: 100%;
    text-align: center;
    margin: 10px 0;
  }

  .network-fee-wrapper {
    width: 100%;
    height: 100%;
    margin-top: 12px;

    .error-message {
      position: relative;
      width: 100%;
      padding: 0 16px;
      ${o.captionReg};
      font-size: 13px;
      color: ${s(`red`,`_5`)};
    }
  }

  .button-group {
    position: absolute;
    display: flex;
    width: 100%;
    bottom: 0;
    justify-content: space-between;

    button {
      width: 100%;
      height: 48px;
      border-radius: 30px;
      ${o.body1Bold};
      background-color: ${s(`neutral`,`_5`)};
      transition: 0.2s;

      &:hover {
        background-color: ${s(`neutral`,`_6`)};
      }

      &:last-child {
        margin-left: 10px;
      }

      &.send {
        background-color: ${s(`primary`,`_6`)};

        &:hover {
          background-color: ${s(`primary`,`_7`)};
        }
      }
    }
  }
`})),M,N,P,F=e((()=>{p(),w(),k(),d(),v(),h(),y(),T(),M=t(c()),j(),N=u(),P=({grc721Token:e,toAddress:t,networkFee:n,memo:r,isErrorNetworkFee:i,queryGRC721TokenUri:a,onClickBack:o,onClickCancel:s,onClickSend:c,onClickNetworkFeeSetting:l})=>{let u=new O(`INSUFFICIENT_NETWORK_FEE`),d=(0,M.useMemo)(()=>`Sending ${e.name} #${e.tokenId}`,[e]),p=(0,M.useMemo)(()=>u.message,[]);return(0,N.jsxs)(A,{children:[(0,N.jsx)(`div`,{className:`sub-header-wrapper`,children:(0,N.jsx)(m,{leftElement:{element:(0,N.jsx)(`img`,{src:`${f}`,alt:`back image`}),onClick:o},title:d})}),(0,N.jsxs)(`div`,{className:`info-wrapper`,children:[(0,N.jsx)(`div`,{className:`asset-card-wrapper`,children:(0,N.jsx)(b,{asset:e,queryGRC721TokenUri:a})}),(0,N.jsx)(`div`,{className:`direction-icon-wrapper`,children:(0,N.jsx)(`img`,{src:`${C}`,alt:`direction-icon`})}),(0,N.jsx)(E,{toAddress:t,memo:r})]}),(0,N.jsx)(`div`,{className:`network-fee-wrapper`,children:(0,N.jsx)(g,{isError:i,value:n?.amount||``,denom:n?.denom||``,errorMessage:p,onClickSetting:l})}),(0,N.jsx)(_,{leftButton:{text:`Cancel`,onClick:s},rightButton:{text:`Send`,onClick:c,primary:!0},filled:!0})]})},P.__docgenInfo={description:``,methods:[],displayName:`NFTTransferSummary`,props:{grc721Token:{required:!0,tsType:{name:`GRC721Model`},description:``},toAddress:{required:!0,tsType:{name:`string`},description:``},networkFee:{required:!0,tsType:{name:`union`,raw:`NetworkFeeType | null`,elements:[{name:`NetworkFeeType`},{name:`null`}]},description:``},memo:{required:!0,tsType:{name:`string`},description:``},isErrorNetworkFee:{required:!1,tsType:{name:`boolean`},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},onClickBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickSend:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickNetworkFeeSetting:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),I,L,R,z,B;e((()=>{F(),I=u(),{action:L}=__STORYBOOK_MODULE_ACTIONS__,R={title:`components/transfer/NFTTransferSummary`,component:P},z={args:{isErrorNetworkFee:!1,grc721Token:{metadata:null,name:``,networkId:``,packagePath:``,symbol:``,tokenId:``,type:`grc721`,isMetadata:!0,isTokenUri:!0},queryGRC721TokenUri:()=>({}),toAddress:`g1fnakf9vrd6uqn8qdmp88yac4p0ngy572answ9f`,networkFee:{amount:`0.0048`,denom:`GNOT`},onClickBack:L(`click back`),onClickCancel:L(`click cancel`),onClickSend:L(`click send`)},render:e=>(0,I.jsx)(`div`,{style:{height:`500px`},children:(0,I.jsx)(P,{...e})})},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  args: {
    isErrorNetworkFee: false,
    grc721Token: {
      metadata: null,
      name: '',
      networkId: '',
      packagePath: '',
      symbol: '',
      tokenId: '',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true
    },
    queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
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
      <NFTTransferSummary {...args} />
    </div>
}`,...z.parameters?.docs?.source}}},B=[`Default`]}))();export{z as Default,B as __namedExportsOrder,R as default};