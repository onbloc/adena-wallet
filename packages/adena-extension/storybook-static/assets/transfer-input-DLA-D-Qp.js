import{m as p,j as e}from"./global-style-Be4sOX77.js";import{S as n,a as l}from"./index-CulhM7-u.js";import{U as g,B as c}from"./index-Dfwxv35r.js";import"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{A as y}from"./address-input-RcD1gknS.js";import{B as v}from"./balance-input-am1qlQrl.js";import{M as k}from"./memo-input-Dfm5qt0l.js";import{d as x}from"./theme-D2qI5cuM.js";const f=x.div`
  ${p.flex({align:"normal",justify:"normal"})};
  position: relative;
  width: 100%;
  width: 100%;
  height: auto;
  padding: 24px 20px 96px;

  .logo-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 5px;
    margin: 30px 0;
    .logo {
      width: 100px;
      height: 100px;
    }
  }

  .address-input-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .balance-input-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .memo-input-wrapper {
    display: flex;
    padding-bottom: 20px;
  }
`,q=({tokenMetainfo:r,addressInput:t,balanceInput:i,memoInput:a,hasBackButton:o,isNext:s,onClickBack:u,onClickCancel:d,onClickNext:m})=>e.jsxs(f,{children:[o?e.jsx(n,{title:`Send ${r?.symbol||""}`,leftElement:{element:e.jsx("img",{src:`${l}`,alt:"back image"}),onClick:u}}):e.jsx(n,{title:`Send ${r?.symbol||""}`}),e.jsx("div",{className:"logo-wrapper",children:e.jsx("img",{className:"logo",src:r?.image||g,alt:"token image"})}),e.jsx("div",{className:"address-input-wrapper",children:e.jsx(y,{...t})}),e.jsx("div",{className:"balance-input-wrapper",children:e.jsx(v,{...i})}),e.jsx("div",{className:"memo-input-wrapper",children:e.jsx(k,{...a})}),e.jsx(c,{leftButton:{text:"Cancel",onClick:d},rightButton:{text:"Next",onClick:m,disabled:!s,primary:!0},filled:!0})]});q.__docgenInfo={description:"",methods:[],displayName:"TransferInput",props:{tokenMetainfo:{required:!1,tsType:{name:"TokenModel"},description:""},addressInput:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  opened: boolean
  hasError: boolean
  selected: boolean
  selectedName: string
  selectedDescription: string
  address: string
  errorMessage?: string
  addressBookInfos: {
    addressBookId: string
    name: string
    description: string
  }[]
  onClickInputIcon: (selected: boolean) => void
  onChangeAddress: (address: string) => void
  onClickAddressBook: (addressBookId: string) => void
}`,signature:{properties:[{key:"opened",value:{name:"boolean",required:!0}},{key:"hasError",value:{name:"boolean",required:!0}},{key:"selected",value:{name:"boolean",required:!0}},{key:"selectedName",value:{name:"string",required:!0}},{key:"selectedDescription",value:{name:"string",required:!0}},{key:"address",value:{name:"string",required:!0}},{key:"errorMessage",value:{name:"string",required:!1}},{key:"addressBookInfos",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  addressBookId: string
  name: string
  description: string
}`,signature:{properties:[{key:"addressBookId",value:{name:"string",required:!0}},{key:"name",value:{name:"string",required:!0}},{key:"description",value:{name:"string",required:!0}}]}}],raw:`{
  addressBookId: string
  name: string
  description: string
}[]`,required:!0}},{key:"onClickInputIcon",value:{name:"signature",type:"function",raw:"(selected: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"selected"}],return:{name:"void"}},required:!0}},{key:"onChangeAddress",value:{name:"signature",type:"function",raw:"(address: string) => void",signature:{arguments:[{type:{name:"string"},name:"address"}],return:{name:"void"}},required:!0}},{key:"onClickAddressBook",value:{name:"signature",type:"function",raw:"(addressBookId: string) => void",signature:{arguments:[{type:{name:"string"},name:"addressBookId"}],return:{name:"void"}},required:!0}}]}},description:""},balanceInput:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  hasError: boolean
  amount: string
  denom: string
  description: string
  onChangeAmount: (value: string) => void
  onClickMax: () => void
}`,signature:{properties:[{key:"hasError",value:{name:"boolean",required:!0}},{key:"amount",value:{name:"string",required:!0}},{key:"denom",value:{name:"string",required:!0}},{key:"description",value:{name:"string",required:!0}},{key:"onChangeAmount",value:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}},required:!0}},{key:"onClickMax",value:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}},required:!0}}]}},description:""},memoInput:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  memo: string
  memoError?: BaseError | null
  onChangeMemo: (memo: string) => void
}`,signature:{properties:[{key:"memo",value:{name:"string",required:!0}},{key:"memoError",value:{name:"union",raw:"BaseError | null",elements:[{name:"BaseError"},{name:"null"}],required:!1}},{key:"onChangeMemo",value:{name:"signature",type:"function",raw:"(memo: string) => void",signature:{arguments:[{type:{name:"string"},name:"memo"}],return:{name:"void"}},required:!0}}]}},description:""},isNext:{required:!0,tsType:{name:"boolean"},description:""},hasBackButton:{required:!0,tsType:{name:"boolean"},description:""},onClickBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickNext:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{q as T};
