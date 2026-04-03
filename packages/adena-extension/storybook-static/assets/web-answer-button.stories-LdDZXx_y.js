import{j as a}from"./global-style-Be4sOX77.js";import"./index-Ct-w3XHB.js";import{P as u}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{l as t,d as s,w as l,g as i}from"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./bignumber-B1z4pYDt.js";const p=s(u)`
  width: 100%;
  height: 44px;
  padding: 16px;
  align-items: flex-start;
  justify-content: center;
  color: ${i("webNeutral","_200")};
  border-radius: 10px;
  border: 1px solid ${i("webNeutral","_800")};
  background-color: transparent;
  transition: 0.2s;
  ${l.body4}

  ${({selected:r})=>r===!1?t`
          &:hover {
            background-color: rgba(255, 255, 255, 0.04);
          }
        `:""}
`,m=s(p)`
  ${({theme:r,selected:e})=>e?t`
          cursor: default;
          color: ${r.webSuccess._100};
          border-color: ${r.webSuccess._200};
          background-color: ${r.webSuccess._300};
        `:""}
`,b=s(p)`
  ${({theme:r,selected:e})=>e?t`
          cursor: default;
          color: ${r.webError._100};
          border-color: ${r.webError._200};
          background-color: ${r.webError._300};
        `:""}
`,d=({answer:r,correct:e,selected:n,onClick:c})=>e?a.jsx(m,{selected:n,onClick:c,children:r}):a.jsx(b,{selected:n,onClick:c,children:r});d.__docgenInfo={description:"",methods:[],displayName:"WebAnswerButton",props:{answer:{required:!0,tsType:{name:"string"},description:""},correct:{required:!0,tsType:{name:"boolean"},description:""},selected:{required:!0,tsType:{name:"boolean"},description:""},onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const{action:w}=__STORYBOOK_MODULE_ACTIONS__,v={title:"components/molecules/WebAnswerButton",component:d},o={args:{correct:!0,selected:!1,answer:"answer",onClick:w("click answer")}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    correct: true,
    selected: false,
    answer: 'answer',
    onClick: action('click answer')
  }
}`,...o.parameters?.docs?.source}}};const D=["Default"];export{o as Default,D as __namedExportsOrder,v as default};
