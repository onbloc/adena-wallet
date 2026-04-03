import{m as c,j as t}from"./global-style-Be4sOX77.js";import{B as f}from"./bignumber-B1z4pYDt.js";import{f as h,l as a,d as g,r as y}from"./theme-D2qI5cuM.js";const x=g.div.withConfig({shouldForwardProp:e=>!["fontColor","fontStyleKey","minimumFontSize","lineHeight"].includes(e)})`
  ${c.flex({direction:"row",align:"normal",justify:"normal"})};
  width: fit-content;
  height: auto;

  .value {
    display: contents;
    color: ${({fontColor:e})=>e};
    text-align: bottom;

    ${({fontStyleKey:e})=>h[e]};
    ${({lineHeight:e})=>e?a`
            line-height: ${e};
          `:a``};

    &.decimal {
      font-size: ${({minimumFontSize:e})=>e};
    }
  }
`,v=({value:e,fontColor:n="white",fontStyleKey:o="header6",minimumFontSize:l="14px",lineHeight:d,withSign:m=!1})=>{const i=e.includes("."),[s,u]=i?e.split("."):[e,""],p=y.useMemo(()=>{const r=f(s.replace(/,/g,"")).toFormat(0);return m?`+${r}`:r},[s]);return t.jsxs(x,{fontColor:n,fontStyleKey:o,minimumFontSize:l,lineHeight:d,children:[t.jsx("span",{className:"value integer",children:p}),t.jsxs("span",{className:"value decimal",children:[i?".":"",u]})]})};v.__docgenInfo={description:"",methods:[],displayName:"HighlightNumber",props:{value:{required:!0,tsType:{name:"string"},description:""},fontColor:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'white'",computed:!1}},fontStyleKey:{required:!1,tsType:{name:"FontsType"},description:"",defaultValue:{value:"'header6'",computed:!1}},minimumFontSize:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'14px'",computed:!1}},lineHeight:{required:!1,tsType:{name:"string"},description:""},withSign:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};export{v as H};
