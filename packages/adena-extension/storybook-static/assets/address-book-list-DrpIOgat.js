import{m as o,j as e}from"./global-style-Be4sOX77.js";import{T as m}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{g as i,d,f as p,n as c}from"./theme-D2qI5cuM.js";const l=d.div`
  ${o.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
  background-color: ${i("neutral","_9")};

  .no-address-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 13px 16px;
  }
`,u=d.div`
  ${o.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  min-height: 48px;
  padding: 13px 16px;
  ${p.body2Reg};
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${i("neutral","_7")};
  }

  .name {
    font-weight: 600;
  }

  .address {
    color: ${i("neutral","a")};
  }
`,g=({addressBookId:s,name:t,address:n,onClickItem:r})=>e.jsxs(u,{onClick:()=>r(s),children:[e.jsx("div",{className:"name",children:t}),e.jsx("div",{className:"address",children:n})]}),x=({addressBookInfos:s,onClickItem:t})=>{const n=c();return e.jsxs(l,{children:[s.length===0&&e.jsx("div",{className:"no-address-wrapper",children:e.jsx(m,{className:"no-address",type:"body2Reg",color:n.neutral.a,children:"No address registered"})}),s.map((r,a)=>e.jsx(g,{addressBookId:r.addressBookId,address:r.description,name:r.name,onClickItem:t},a))]})};x.__docgenInfo={description:"",methods:[],displayName:"AddressBookList",props:{addressBookInfos:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  addressBookId: string
  name: string
  description: string
}`,signature:{properties:[{key:"addressBookId",value:{name:"string",required:!0}},{key:"name",value:{name:"string",required:!0}},{key:"description",value:{name:"string",required:!0}}]}}],raw:`{
  addressBookId: string
  name: string
  description: string
}[]`},description:""},onClickItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(addressBookId: string) => void",signature:{arguments:[{type:{name:"string"},name:"addressBookId"}],return:{name:"void"}}},description:""}}};export{x as A};
