import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,g as n,i as r,n as i,rt as a,t as o,v as s}from"./iframe-BclzClxJ.js";import{t as c}from"./highlight-number-5tnmBTh7.js";import{t as l}from"./atoms-kch4SvDy.js";var u,d=e((()=>{r(),t(),u=n.div.withConfig({shouldForwardProp:e=>![`orientation`,`fontColor`,`fontStyleKey`,`minimumFontSize`,`lineHeight`,`maxWidth`].includes(e)})`
  display: flex;
  flex-direction: ${({orientation:e})=>e===`HORIZONTAL`?`row`:`column`};
  ${({orientation:e,maxWidth:t})=>e===`HORIZONTAL`?s`
          flex-direction: row;
        `:t?s`
            flex-flow: row wrap;
            max-width: ${t}px;
          `:s`
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
      ${({fontStyleKey:e})=>i[e]};
      ${({lineHeight:e})=>e?s`
              line-height: ${e};
            `:s``};
    }
  }
`})),f,p,m=e((()=>{l(),a(),d(),f=o(),p=({value:e,denom:t,orientation:n=`VERTICAL`,fontColor:r=`white`,fontStyleKey:i=`header6`,minimumFontSize:a=`14px`,lineHeight:o,maxWidth:s,withSign:l=!1})=>(0,f.jsxs)(u,{orientation:n,fontColor:r,fontStyleKey:i,minimumFontSize:a,lineHeight:o,maxWidth:s,children:[(0,f.jsx)(c,{value:e,fontColor:r,fontStyleKey:i,minimumFontSize:a,lineHeight:o,withSign:l}),(0,f.jsx)(`div`,{className:`denom-wrapper`,children:(0,f.jsx)(`span`,{className:`denom`,children:t})})]}),p.__docgenInfo={description:``,methods:[],displayName:`TokenBalance`,props:{value:{required:!0,tsType:{name:`string`},description:``},denom:{required:!0,tsType:{name:`string`},description:``},orientation:{required:!1,tsType:{name:`union`,raw:`'VERTICAL' | 'HORIZONTAL'`,elements:[{name:`literal`,value:`'VERTICAL'`},{name:`literal`,value:`'HORIZONTAL'`}]},description:``,defaultValue:{value:`'VERTICAL'`,computed:!1}},fontColor:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'white'`,computed:!1}},fontStyleKey:{required:!1,tsType:{name:`FontsType`},description:``,defaultValue:{value:`'header6'`,computed:!1}},minimumFontSize:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'14px'`,computed:!1}},lineHeight:{required:!1,tsType:{name:`string`},description:``},maxWidth:{required:!1,tsType:{name:`number`},description:``},withSign:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}}}}}));export{m as n,p as t};