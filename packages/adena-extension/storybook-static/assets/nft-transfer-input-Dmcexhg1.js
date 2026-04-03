import{m as l,j as e}from"./global-style-Be4sOX77.js";import{S as t,a as g}from"./index-CulhM7-u.js";import"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{B as c}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{N as y}from"./nft-asset-image-card-7BXszIRp.js";import{A as k}from"./address-input-RcD1gknS.js";import{M as v}from"./memo-input-Dfm5qt0l.js";import{d as x,r as f}from"./theme-D2qI5cuM.js";const w=x.div`
  ${l.flex({align:"normal",justify:"normal"})};
  position: relative;
  width: 100%;
  width: 100%;
  height: auto;
  padding: 24px 20px 96px;

  .asset-card-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 25px auto 30px;
    width: 100px;
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
`,q=({grc721Token:r,addressInput:s,memoInput:a,hasBackButton:i,isNext:o,queryGRC721TokenUri:u,onClickBack:m,onClickCancel:d,onClickNext:p})=>{const n=f.useMemo(()=>`Send ${r.name} #${r.tokenId}`,[r]);return e.jsxs(w,{children:[i?e.jsx(t,{title:n,leftElement:{element:e.jsx("img",{src:`${g}`,alt:"back image"}),onClick:m}}):e.jsx(t,{title:n}),e.jsx("div",{className:"asset-card-wrapper",children:e.jsx(y,{asset:r,queryGRC721TokenUri:u})}),e.jsx("div",{className:"address-input-wrapper",children:e.jsx(k,{...s})}),e.jsx("div",{className:"memo-input-wrapper",children:e.jsx(v,{...a})}),e.jsx(c,{leftButton:{text:"Cancel",onClick:d},rightButton:{text:"Next",onClick:p,disabled:!o,primary:!0},filled:!0})]})};q.__docgenInfo={description:"",methods:[],displayName:"NFTTransferInput",props:{grc721Token:{required:!0,tsType:{name:"GRC721Model"},description:""},addressInput:{required:!0,tsType:{name:"signature",type:"object",raw:`{
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
}[]`,required:!0}},{key:"onClickInputIcon",value:{name:"signature",type:"function",raw:"(selected: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"selected"}],return:{name:"void"}},required:!0}},{key:"onChangeAddress",value:{name:"signature",type:"function",raw:"(address: string) => void",signature:{arguments:[{type:{name:"string"},name:"address"}],return:{name:"void"}},required:!0}},{key:"onClickAddressBook",value:{name:"signature",type:"function",raw:"(addressBookId: string) => void",signature:{arguments:[{type:{name:"string"},name:"addressBookId"}],return:{name:"void"}},required:!0}}]}},description:""},memoInput:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  memo: string
  memoError?: BaseError | null
  onChangeMemo: (memo: string) => void
}`,signature:{properties:[{key:"memo",value:{name:"string",required:!0}},{key:"memoError",value:{name:"union",raw:"BaseError | null",elements:[{name:"BaseError"},{name:"null"}],required:!1}},{key:"onChangeMemo",value:{name:"signature",type:"function",raw:"(memo: string) => void",signature:{arguments:[{type:{name:"string"},name:"memo"}],return:{name:"void"}},required:!0}}]}},description:""},isNext:{required:!0,tsType:{name:"boolean"},description:""},hasBackButton:{required:!0,tsType:{name:"boolean"},description:""},queryGRC721TokenUri:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},onClickBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickNext:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{q as N};
