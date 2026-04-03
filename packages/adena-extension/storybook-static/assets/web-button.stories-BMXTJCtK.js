import{I as m}from"./icon-add-vPH02yTE.js";import{j as t}from"./global-style-Be4sOX77.js";import{d as r}from"./theme-D2qI5cuM.js";import{V as p}from"./index-CLRA8FOO.js";import{W as c}from"./index-CpLq81TF.js";import{W as f}from"./index-jlviZXHb.js";import"./index-BAMY2Nnw.js";import"./index-B3tmVslE.js";const y=r(c)`
  flex-direction: column;
  height: 104px;
  padding: 12px 16px;
  align-items: flex-start;
  justify-content: space-between;
`,x=r(p)`
  width: 24px;
  height: 24px;
  justify-content: center;

  svg {
    width: 100%;
  }
`,n=({buttonRef:a,iconElement:i,text:o,figure:s,width:l="100%",disabled:d=!1,onClick:u})=>t.jsxs(y,{buttonRef:a,style:{width:l},figure:s,size:"large",disabled:d,onClick:u,children:[t.jsx(x,{children:i}),t.jsx(f,{type:"title5",color:"inherit",children:o})]});n.__docgenInfo={description:"",methods:[],displayName:"WebMainButton",props:{buttonRef:{required:!1,tsType:{name:"ReactRefObject",raw:"React.RefObject<HTMLButtonElement>",elements:[{name:"HTMLButtonElement"}]},description:""},figure:{required:!0,tsType:{name:"union",raw:"'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'",elements:[{name:"literal",value:"'primary'"},{name:"literal",value:"'secondary'"},{name:"literal",value:"'tertiary'"},{name:"literal",value:"'quaternary'"},{name:"literal",value:"'quinary'"}]},description:""},text:{required:!0,tsType:{name:"string"},description:""},width:{required:!1,tsType:{name:"CSSProperties['width']",raw:"CSSProperties['width']"},description:"",defaultValue:{value:"'100%'",computed:!1}},iconElement:{required:!0,tsType:{name:"JSX.Element"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const j={title:"components/atoms/WebMainButton",component:n},e={args:{figure:"primary",width:"200px",text:"Connect Hardware Wallet",iconElement:m(),disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    figure: 'primary',
    width: '200px',
    text: 'Connect Hardware Wallet',
    iconElement: IconAdd(),
    disabled: true
  }
}`,...e.parameters?.docs?.source}}};const E=["Default"];export{e as Default,E as __namedExportsOrder,j as default};
