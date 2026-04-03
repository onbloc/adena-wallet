import{m as l,j as e}from"./global-style-Be4sOX77.js";import{a as d}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{d as s,f as a,g as r}from"./theme-D2qI5cuM.js";const m=s.div`
  ${l.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
`,c=s.div`
  ${l.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  height: 48px;
  padding: 13px 16px;
  background-color: ${r("neutral","_9")};
  border-radius: 30px;

  & + & {
    margin-top: 12px;
  }

  .title {
    display: inline-flex;
    flex-shrink: 0;
    color: ${r("neutral","a")};
    ${a.body2Reg};
  }

  .value {
    display: inline-block;
    max-width: 155px;
    color: ${r("neutral","_1")};
    ${a.body2Reg};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`,x=s(d)`
  width: 40px;
  height: 10px;
`,n=({title:o,value:i,isLoading:t})=>e.jsxs(c,{children:[e.jsxs("span",{className:"title",children:[o,":"]}),t?e.jsx(x,{}):e.jsx("span",{className:"value",children:i})]}),u=({isLoading:o,symbol:i,path:t,decimals:p})=>e.jsxs(m,{children:[e.jsx(n,{title:"Token Symbol",value:i,isLoading:o}),e.jsx(n,{title:"Token Path",value:t,isLoading:o}),e.jsx(n,{title:"Token Decimals",value:p,isLoading:o})]});u.__docgenInfo={description:"",methods:[],displayName:"AdditionalTokenInfo",props:{isLoading:{required:!0,tsType:{name:"boolean"},description:""},symbol:{required:!0,tsType:{name:"string"},description:""},path:{required:!0,tsType:{name:"string"},description:""},decimals:{required:!0,tsType:{name:"string"},description:""}}};export{u as A};
