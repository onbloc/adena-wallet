import{j as r}from"./global-style-Be4sOX77.js";import"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import{H as m}from"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{f as u,l as t,d as c}from"./theme-D2qI5cuM.js";const f=c.div.withConfig({shouldForwardProp:e=>!["orientation","fontColor","fontStyleKey","minimumFontSize","lineHeight","maxWidth"].includes(e)})`
  display: flex;
  flex-direction: ${({orientation:e})=>e==="HORIZONTAL"?"row":"column"};
  ${({orientation:e,maxWidth:i})=>e==="HORIZONTAL"?t`
          flex-direction: row;
        `:i?t`
            flex-flow: row wrap;
            max-width: ${i}px;
          `:t`
            flex-direction: column;
          `}
  width: fit-content;
  height: auto;
  text-align: center;
  justify-content: center;
  align-items: flex-start;
  column-gap: 4px;

  .denom-wrapper {
    display: inline-flex;

    .denom {
      display: contents;
      color: ${({fontColor:e})=>e};
      ${({fontStyleKey:e})=>u[e]};
      ${({lineHeight:e})=>e?t`
              line-height: ${e};
            `:t``};
    }
  }
`,T=({value:e,denom:i,orientation:s="VERTICAL",fontColor:a="white",fontStyleKey:n="header6",minimumFontSize:o="14px",lineHeight:l,maxWidth:p,withSign:d=!1})=>r.jsxs(f,{orientation:s,fontColor:a,fontStyleKey:n,minimumFontSize:o,lineHeight:l,maxWidth:p,children:[r.jsx(m,{value:e,fontColor:a,fontStyleKey:n,minimumFontSize:o,lineHeight:l,withSign:d}),r.jsx("div",{className:"denom-wrapper",children:r.jsx("span",{className:"denom",children:i})})]});T.__docgenInfo={description:"",methods:[],displayName:"TokenBalance",props:{value:{required:!0,tsType:{name:"string"},description:""},denom:{required:!0,tsType:{name:"string"},description:""},orientation:{required:!1,tsType:{name:"union",raw:"'VERTICAL' | 'HORIZONTAL'",elements:[{name:"literal",value:"'VERTICAL'"},{name:"literal",value:"'HORIZONTAL'"}]},description:"",defaultValue:{value:"'VERTICAL'",computed:!1}},fontColor:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'white'",computed:!1}},fontStyleKey:{required:!1,tsType:{name:"FontsType"},description:"",defaultValue:{value:"'header6'",computed:!1}},minimumFontSize:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'14px'",computed:!1}},lineHeight:{required:!1,tsType:{name:"string"},description:""},maxWidth:{required:!1,tsType:{name:"number"},description:""},withSign:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};export{T};
