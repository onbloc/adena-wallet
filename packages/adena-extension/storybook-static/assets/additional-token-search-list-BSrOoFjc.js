import{m as o,j as t}from"./global-style-Be4sOX77.js";import{m as h}from"./string-utils-Bff5ZSZ1.js";import{f as s,g as i,d,r as l}from"./theme-D2qI5cuM.js";const x=d.div`
  ${o.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
  max-height: 240px;

  .scroll-wrapper {
    ${o.flex({align:"normal",justify:"normal"})};
    width: 100%;
    overflow-y: auto;
  }

  .no-content {
    display: flex;
    width: 100%;
    margin: 40px auto 180px auto;
    color: ${i("neutral","a")};
    ${s.body1Reg};
    justify-content: center;
    align-items: center;
  }
`,u=d.div`
  ${o.flex({direction:"row",align:"normal",justify:"space-between"})};
  width: 100%;
  height: auto;
  padding: 14px 15px;
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${i("neutral","_7")};
  }

  .title {
    display: flex;
    flex-shrink: 0;
    max-width: calc(100% - 140px);
    color: ${i("neutral","_1")};
    ${s.body2Reg};

    .name {
      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 3px;
    }

    .symbol {
      display: inline-block;
      width: fit-content;
    }
  }

  .path {
    display: inline-block;
    flex-shrink: 0;
    max-width: 140px;
    color: ${i("neutral","a")};
    ${s.body2Reg}
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`,f=({tokenId:n,name:r,symbol:e,path:a,onClickListItem:c})=>{const p=l.useMemo(()=>e.length>5?`${e.substring(0,5)}...`:e,[e]),m=l.useMemo(()=>h(a||""),[a]);return t.jsxs(u,{onClick:()=>c(n),children:[t.jsxs("span",{className:"title",children:[t.jsx("span",{className:"name",children:r}),t.jsx("span",{className:"symbol",children:`(${p})`})]}),t.jsx("span",{className:"path",children:m})]})},g=({tokenInfos:n,onClickListItem:r})=>t.jsx(x,{children:t.jsx("div",{className:"scroll-wrapper",children:n.length===0?t.jsx("span",{className:"no-content",children:"No Tokens to Search"}):n.map((e,a)=>t.jsx(f,{tokenId:e.tokenId,symbol:e.symbol,name:e.name,path:e.pathInfo,onClickListItem:r},a))})});g.__docgenInfo={description:"",methods:[],displayName:"AdditionalTokenSearchList",props:{tokenInfos:{required:!0,tsType:{name:"Array",elements:[{name:"TokenInfo"}],raw:"TokenInfo[]"},description:""},onClickListItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(tokenId: string) => void",signature:{arguments:[{type:{name:"string"},name:"tokenId"}],return:{name:"void"}}},description:""}}};export{g as A};
