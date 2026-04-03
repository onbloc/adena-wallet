import{m as l,j as e}from"./global-style-Be4sOX77.js";import{T as m}from"./token-list-item-balance-fXZxQzgW.js";import{f as g,g as t,d as c}from"./theme-D2qI5cuM.js";const h=c.div`
  ${l.flex({direction:"row",justify:"flex-start"})};
  padding: 13px;
  width: 100%;
  height: auto;
  background: ${t("neutral","_9")};
  border-radius: 18px;
  transition: 0.2s;

  & + & {
    margin-top: 12px;
  }

  &:hover {
    background: ${t("neutral","_7")};
    cursor: pointer;
  }

  .logo-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    margin-right: 12px;

    .logo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
  }

  .name-wrapper {
    display: inline-flex;
    width: 100%;
    flex-shrink: 1;
    align-items: center;
    height: 21px;

    .name {
      display: contents;
      ${g.body2Bold};
      line-height: 17px;
    }
  }

  .balance-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    height: 21px;
    line-height: 17px;
    align-items: flex-start;
    justify-content: flex-end;
  }
`,x=({token:r,completeImageLoading:a,onClickTokenItem:o})=>{const{tokenId:s,logo:n,name:d,balanceAmount:p}=r,i=()=>{a(n)};return e.jsxs(h,{onClick:()=>o(s),children:[e.jsx("div",{className:"logo-wrapper",children:e.jsx("img",{className:"logo",src:n,onLoad:i,onError:i,loading:"eager",decoding:"sync",alt:"token img"})}),e.jsx("div",{className:"name-wrapper",children:e.jsx("span",{className:"name",children:d})}),e.jsx("div",{className:"balance-wrapper",children:e.jsx(m,{amount:p})})]})};x.__docgenInfo={description:"",methods:[],displayName:"TokenListItem",props:{token:{required:!0,tsType:{name:"MainToken"},description:""},completeImageLoading:{required:!0,tsType:{name:"signature",type:"function",raw:"(imageUrl: string) => void",signature:{arguments:[{type:{name:"string"},name:"imageUrl"}],return:{name:"void"}}},description:""},onClickTokenItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(tokenId: string) => void",signature:{arguments:[{type:{name:"string"},name:"tokenId"}],return:{name:"void"}}},description:""}}};export{x as T};
