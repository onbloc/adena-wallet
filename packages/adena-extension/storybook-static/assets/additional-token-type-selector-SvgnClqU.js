import{j as o}from"./global-style-Be4sOX77.js";import{g as r,d as i,f as d,r as c}from"./theme-D2qI5cuM.js";import"./index-Ct-w3XHB.js";import{R as l,V as m}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";const u=i(l)`
  display: flex;
  width: 100%;
  height: 48px;
  padding: 5px;
  gap: 10px;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  background-color: ${r("neutral","_9")};
`,y=i(m)`
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  color: ${r("neutral","a")};
  ${d.body2Reg}
  cursor: pointer;

  &.selected {
    color: ${r("neutral","_1")};
    background-color: ${r("neutral","_7")};
  }
`;var g=(e=>(e[e.SEARCH=0]="SEARCH",e[e.MANUAL=1]="MANUAL",e))(g||{});const x={0:"Search",1:"Manual"},T=({type:e,setType:n})=>{const a=[0,1],p=c.useCallback(t=>{t!==e&&n(t)},[e]);return o.jsx(u,{children:a.map((t,s)=>o.jsx(y,{className:t===e?"selected":"",onClick:()=>p(t),children:x[t]},s))})};T.__docgenInfo={description:"",methods:[],displayName:"AdditionalTokenTypeSelector",props:{type:{required:!0,tsType:{name:"AddingType"},description:""},setType:{required:!0,tsType:{name:"signature",type:"function",raw:"(type: AddingType) => void",signature:{arguments:[{type:{name:"AddingType"},name:"type"}],return:{name:"void"}}},description:""}}};export{T as A,g as a};
