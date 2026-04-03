import{m as s,j as t}from"./global-style-Be4sOX77.js";import"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import{T as a}from"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{f as n,g as i,d}from"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./index-Ct-w3XHB.js";import"./index-CulhM7-u.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./bignumber-B1z4pYDt.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-B3tmVslE.js";import"./index-jlviZXHb.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./client-utils-zr3RfGzN.js";import"./index-y5y07clE.js";import"./gte-LYzHDOB4.js";import"./common-unknown-logo-D3UstGT7.js";import"./info-tooltip-DLlSKEy5.js";import"./wallet-BURXSrHk.js";import"./network-fee-custom-input-pot4XkOO.js";import"./token.constant-C-ogqcde.js";import"./index-B5E4NBgv.js";import"./common-arrow-up-gray-kFpYaQkk.js";import"./icon-link-BfCCJL0P.js";import"./string-utils-Bff5ZSZ1.js";import"./encoding-util-0q6lHXNs.js";import"./index-DuHfkOKV.js";import"./index-CgTU6P2S.js";import"./lodash-BU2fF3dy.js";const c=d.div`
  ${s.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  padding: 14px 16px;
  background-color: ${i("neutral","_9")};
  border: 1px solid ${i("neutral","_7")};
  border-radius: 30px;
  ${({isError:e,theme:o})=>e&&`border-color: ${o.red._5};`}

  .key {
    color: ${i("neutral","a")};
    ${n.body2Reg};
  }
`,m=({isError:e,value:o,denom:p})=>t.jsxs(c,{isError:e,children:[t.jsx("span",{className:"key",children:"Network Fee"}),t.jsx(a,{value:o,denom:p,fontStyleKey:"body2Reg",minimumFontSize:"11px",orientation:"HORIZONTAL"})]});m.__docgenInfo={description:"",methods:[],displayName:"TransferSummaryNetworkFee",props:{isError:{required:!1,tsType:{name:"boolean"},description:""},value:{required:!0,tsType:{name:"string"},description:""},denom:{required:!0,tsType:{name:"string"},description:""}}};const Y={title:"components/transfer/TransferSummaryNetworkFee",component:m},r={args:{value:"0.0048",denom:"GNOT"}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    value: '0.0048',
    denom: 'GNOT'
  }
}`,...r.parameters?.docs?.source}}};const rr=["Default"];export{r as Default,rr as __namedExportsOrder,Y as default};
