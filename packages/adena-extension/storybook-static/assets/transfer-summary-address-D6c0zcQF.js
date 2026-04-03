import{j as e}from"./global-style-Be4sOX77.js";import{f as t,g as a,d as i,r as p}from"./theme-D2qI5cuM.js";const n=i.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: auto;
  padding: 20px;
  gap: 12px;
  ${t.body2Reg};
  background-color: ${a("neutral","_9")};
  border-radius: 18px;

  .address-wrapper {
    display: flex;
    width: 100%;
    height: auto;
    word-break: break-all;
    overflow: hidden;
  }

  .memo-wrapper {
    display: block;
    width: 100%;
    height: auto;
    color: ${a("neutral","a")};
    word-break: break-all;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`,l=({toAddress:d,memo:r})=>{const o=p.useMemo(()=>{const s="Memo:";return r?`${s} ${r}`:`${s} (Empty)`},[r]);return e.jsxs(n,{children:[e.jsx("div",{className:"address-wrapper",children:d}),e.jsx("div",{className:"memo-wrapper",children:o})]})};l.__docgenInfo={description:"",methods:[],displayName:"TransferSummaryAddress",props:{toAddress:{required:!0,tsType:{name:"string"},description:""},memo:{required:!0,tsType:{name:"string"},description:""}}};export{l as T};
