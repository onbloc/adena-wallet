import{j as o}from"./global-style-Be4sOX77.js";import{s as c}from"./encoding-util-0q6lHXNs.js";import{c as f}from"./index-y5y07clE.js";import{W as y}from"./index-CgTU6P2S.js";import{r as a,d as n}from"./theme-D2qI5cuM.js";import"./index-Ct-w3XHB.js";import{V as p}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import"./index-BAMY2Nnw.js";import"./bignumber-B1z4pYDt.js";function x(){return f.randomBytes(32).toString("hex")}const v=n(p)`
  position: relative;
  overflow: hidden;
  height: 80px;
`,g=n(p)`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: #0000000a;
  backdrop-filter: blur(4px);
  border-radius: 10px;
`,l=({privateKey:s,showBlur:e=!0,readOnly:m=!1,error:u=!1})=>{const i=x(),[d,t]=a.useState(i);return a.useEffect(()=>{if(!e){t(c(s));return}t(i)},[e,s]),a.useEffect(()=>()=>{t("")},[]),o.jsxs(v,{showBlur:e,children:[o.jsx(y,{value:d,placeholder:"Private Key",readOnly:m,error:u,style:{height:"100%"},onChange:()=>{},spellCheck:!1}),e&&o.jsx(g,{})]})};l.__docgenInfo={description:"",methods:[],displayName:"WebPrivateKeyBox",props:{privateKey:{required:!0,tsType:{name:"string"},description:""},showBlur:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}},readOnly:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},error:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const F={title:"components/molecules/WebPrivateKeyBox",component:l},r={args:{privateKey:"privateKey",showBlur:!0}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    privateKey: 'privateKey',
    showBlur: true
  }
}`,...r.parameters?.docs?.source}}};const I=["Default"];export{r as Default,I as __namedExportsOrder,F as default};
