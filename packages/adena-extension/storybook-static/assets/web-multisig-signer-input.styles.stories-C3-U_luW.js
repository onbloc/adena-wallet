import{j as r}from"./global-style-Be4sOX77.js";import{b as q,I as E}from"./index-Ct-w3XHB.js";import{V as l,P as j}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import{W as y}from"./index-jlviZXHb.js";import"./message-handler-D1EeVfGA.js";import"./use-context-CFCzasmX.js";import{d as o,R}from"./theme-D2qI5cuM.js";import"./wallet-BURXSrHk.js";import"./client-utils-zr3RfGzN.js";import"./index-BAMY2Nnw.js";import"./index-y5y07clE.js";import"./lodash-BU2fF3dy.js";import"./bignumber-B1z4pYDt.js";import"./router-BzcCdFuP.js";import"./token.constant-C-ogqcde.js";import"./string-utils-Bff5ZSZ1.js";import"./base-error-B60qQlbC.js";import"./chains-C5osHhKP.js";import"./use-window-size-CkbVq90q.js";import"./index-gZpQvJF3.js";import"./gte-LYzHDOB4.js";const w=7,M=o(l)`
  width: 100%;
  row-gap: 16px;
`,I=o(j)`
  display: flex;
  width: 128px;
  height: 32px;
  padding: 8px 16px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  background: ${({isDisabled:e})=>e?"rgba(255, 255, 255, 0.08)":"rgba(255, 255, 255, 0.12)"};
  position: relative;
  transition: all 0.2s;
  cursor: ${({isDisabled:e})=>e?"not-allowed":"pointer"};
  opacity: ${({isDisabled:e})=>e?"0.5":"1"};
  pointer-events: ${({isDisabled:e})=>e?"none":"auto"};

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    padding: 1px;
    background: ${({isDisabled:e})=>e?"linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%)":"linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%)"};
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  &:hover {
    background: ${({isDisabled:e})=>e?"rgba(255, 255, 255, 0.08)":"rgba(255, 255, 255, 0.2)"};
  }
`,T=o.button`
  display: inline-flex;
  width: 14px;
  height: 14px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  svg {
    width: 100%;
    height: 100%;

    line {
      transition: 0.2s;
      stroke: ${({theme:e})=>e.webNeutral._500};
    }
  }

  &:hover {
    svg {
      line {
        stroke: ${({theme:e})=>e.webNeutral._100};
      }
    }
  }
`,z=o(y)`
  color: ${({theme:e,isDisabled:p})=>p?e.webNeutral._500:e.webNeutral._100};
  font-family: Inter;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: -0.12px;
`,W=o(l)`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  gap: 8px;
`,f=({mode:e,currentAddress:p,signers:u,onAddSigner:h,onRemoveSigner:b,onSignerChange:S,multisigConfigError:C})=>{const A=e==="CREATE"&&!!p,c=R.useMemo(()=>u.length===w,[u]),v=!!C;return r.jsxs(M,{style:{alignItems:"center"},children:[r.jsx(l,{style:{rowGap:16,width:"100%"},children:u.map((x,n)=>r.jsxs(W,{children:[r.jsx(q,{label:`Signer #${n+1}`,value:x,onChange:k=>S(n,k),disabled:n===0&&A,placeholder:"Account Address",error:v}),n>=2&&r.jsx(T,{type:"button",onClick:()=>b(n),children:r.jsx(E,{name:"iconCancel"})})]},`signer-${n}`))}),r.jsx(I,{onClick:h,isDisabled:c,children:r.jsx(z,{type:"body4",isDisabled:c,children:"Add More Signer"})})]})};f.__docgenInfo={description:"",methods:[],displayName:"WebMultisigSignerInput",props:{mode:{required:!0,tsType:{name:"union",raw:"'CREATE' | 'IMPORT'",elements:[{name:"literal",value:"'CREATE'"},{name:"literal",value:"'IMPORT'"}]},description:""},currentAddress:{required:!1,tsType:{name:"string"},description:""},signers:{required:!0,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:""},onSignerChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"index"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onAddSigner:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onRemoveSigner:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number) => void",signature:{arguments:[{type:{name:"number"},name:"index"}],return:{name:"void"}}},description:""},multisigConfigError:{required:!0,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:""}}};const le={title:"components/molecules/WebMultisigSignerInput",component:f},i={args:{mode:"CREATE",currentAddress:"g1abc123def456ghi789jkl012mno345pqr678stu",signers:["g1abc123def456ghi789jkl012mno345pqr678stu",""],onSignerChange:()=>{},onAddSigner:()=>{},onRemoveSigner:()=>{},multisigConfigError:null}},s={args:{mode:"CREATE",currentAddress:"g1abc123def456ghi789jkl012mno345pqr678stu",signers:["g1abc123def456ghi789jkl012mno345pqr678stu","g1xyz987wvu654tsr321qpo098nml765kji432hgf","g1mno345pqr678stu901vwx234yz567abc890def",""],onSignerChange:()=>{},onAddSigner:()=>{},onRemoveSigner:()=>{},multisigConfigError:null}},t={args:{mode:"CREATE",currentAddress:"g1abc123def456ghi789jkl012mno345pqr678stu",signers:["g1abc123def456ghi789jkl012mno345pqr678stu","invalid-address"],onSignerChange:()=>{},onAddSigner:()=>{},onRemoveSigner:()=>{},multisigConfigError:"Invalid signer address format"}},a={args:{mode:"IMPORT",currentAddress:"g1abc123def456ghi789jkl012mno345pqr678stu",signers:["g1abc123def456ghi789jkl012mno345pqr678stu","g1xyz987wvu654tsr321qpo098nml765kji432hgf"],onSignerChange:()=>{},onAddSigner:()=>{},onRemoveSigner:()=>{},multisigConfigError:null}},g={args:{mode:"IMPORT",currentAddress:"g1abc123def456ghi789jkl012mno345pqr678stu",signers:["g1abc123def456ghi789jkl012mno345pqr678stu","g1xyz987wvu654tsr321qpo098nml765kji432hgf","g1mno345pqr678stu901vwx234yz567abc890def","g1def890ghi123jkl456mno789pqr012stu345vwx"],onSignerChange:()=>{},onAddSigner:()=>{},onRemoveSigner:()=>{},multisigConfigError:null}},d={args:{mode:"IMPORT",currentAddress:"g1abc123def456ghi789jkl012mno345pqr678stu",signers:["g1abc123def456ghi789jkl012mno345pqr678stu",""],onSignerChange:()=>{},onAddSigner:()=>{},onRemoveSigner:()=>{},multisigConfigError:"At least 2 signers are required"}},m={args:{mode:"CREATE",currentAddress:"g1abc123def456ghi789jkl012mno345pqr678stu",signers:[""],onSignerChange:()=>{},onAddSigner:()=>{},onRemoveSigner:()=>{},multisigConfigError:null}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'CREATE',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', ''],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null
  }
}`,...i.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'CREATE',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', 'g1xyz987wvu654tsr321qpo098nml765kji432hgf', 'g1mno345pqr678stu901vwx234yz567abc890def', ''],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null
  }
}`,...s.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'CREATE',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', 'invalid-address'],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: 'Invalid signer address format'
  }
}`,...t.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'IMPORT',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', 'g1xyz987wvu654tsr321qpo098nml765kji432hgf'],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null
  }
}`,...a.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'IMPORT',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', 'g1xyz987wvu654tsr321qpo098nml765kji432hgf', 'g1mno345pqr678stu901vwx234yz567abc890def', 'g1def890ghi123jkl456mno789pqr012stu345vwx'],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null
  }
}`,...g.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'IMPORT',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', ''],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: 'At least 2 signers are required'
  }
}`,...d.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'CREATE',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: [''],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null
  }
}`,...m.parameters?.docs?.source}}};const ce=["CreateMode","CreateModeMultipleSigners","CreateModeWithError","ImportMode","ImportModeMultipleSigners","ImportModeWithError","EmptySigners"];export{i as CreateMode,s as CreateModeMultipleSigners,t as CreateModeWithError,m as EmptySigners,a as ImportMode,g as ImportModeMultipleSigners,d as ImportModeWithError,ce as __namedExportsOrder,le as default};
