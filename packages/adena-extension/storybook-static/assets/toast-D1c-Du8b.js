import{j as s}from"./global-style-Be4sOX77.js";import{d as n,f as m,r as o}from"./theme-D2qI5cuM.js";import"./index-Ct-w3XHB.js";import{V as p}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";const c=n(p)`
  position: absolute;
  width: 0;
  height: auto;
  top: 40px;
  left: 50%;
  z-index: 97;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: 0.5s;
  pointer-events: none;

  &.active {
    opacity: 1;
  }
`,u=n(p)`
  width: fit-content;
  flex-shrink: 0;
  padding: 2px 16px;
  color: #fff;
  border-radius: 12.5px;
  background-color: ${({theme:t})=>t.neutral._9};
  ${m.body2Reg}
  white-space: nowrap;
  pointer-events: none;
`,f=({text:t,onFinish:a})=>{const[e,r]=o.useState(!1);return o.useEffect(()=>{r(!0)},[t]),o.useEffect(()=>{if(!e){const i=setTimeout(a,1e3);return()=>{clearTimeout(i)}}},[e]),o.useEffect(()=>{if(e){const i=setTimeout(()=>{r(!1)},3e3);return()=>{clearTimeout(i)}}},[e,t]),s.jsx(c,{className:e?"active":"",children:s.jsx(u,{children:t})})};f.__docgenInfo={description:"",methods:[],displayName:"Toast",props:{text:{required:!0,tsType:{name:"string"},description:""},onFinish:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{f as T};
