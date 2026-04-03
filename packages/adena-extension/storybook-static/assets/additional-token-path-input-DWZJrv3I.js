import{j as t}from"./global-style-Be4sOX77.js";import{T as s}from"./index-Ct-w3XHB.js";import{V as p}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{f as d,g as r,d as m,r as u,t as l}from"./theme-D2qI5cuM.js";const c=m(p)`
  width: 100%;

  .search-input {
    height: 48px;
    padding: 13px 16px;
    background-color: ${r("neutral","_9")};
    border: 1px solid ${r("neutral","_7")};
    color: ${r("neutral","_1")};
    border-radius: 30px;
    ${d.body2Reg};

    &.error {
      border-color: ${r("red","_5")};
    }
  }

  .error-message {
    padding: 0 8px;
    height: 18px;
  }
`,g=({keyword:n,onChangeKeyword:i,errorMessage:e})=>{const o=u.useMemo(()=>!!e,[e]);return t.jsxs(c,{children:[t.jsx("input",{className:o?"search-input error":"search-input",value:n,onChange:a=>i(a.target.value),placeholder:"Search"}),o&&t.jsx(s,{className:"error-message",type:"body2Reg",color:l.red._5,children:e})]})};g.__docgenInfo={description:"",methods:[],displayName:"AdditionalTokenPathInput",props:{keyword:{required:!0,tsType:{name:"string"},description:""},onChangeKeyword:{required:!0,tsType:{name:"signature",type:"function",raw:"(keyword: string) => void",signature:{arguments:[{type:{name:"string"},name:"keyword"}],return:{name:"void"}}},description:""},errorMessage:{required:!0,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:""}}};export{g as A};
