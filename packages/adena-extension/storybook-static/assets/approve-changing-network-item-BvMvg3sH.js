import{m as n,j as e}from"./global-style-Be4sOX77.js";import{U as o}from"./common-unknown-logo-D3UstGT7.js";import{f as a,g as t,d as s}from"./theme-D2qI5cuM.js";const p=s.div`
  ${n.flex()};
  width: 80px;
  height: auto;

  img {
    display: flex;
    width: 80px;
    height: 80px;
    margin-bottom: 15px;
  }

  .chain-name-wrapper {
    display: flex;
    width: 100px;
    padding: 5px 8px;
    background-color: ${t("neutral","_9")};
    border-radius: 8px;
    text-align: center;
    justify-content: center;

    .chain-name {
      display: -webkit-box;
      width: 100%;
      color: ${t("neutral","_1")};
      ${a.body2Reg};
      font-weight: 500;
      text-align: center;
      justify-content: center;
      word-break: break-word;
      text-overflow: ellipsis;
      overflow: hidden;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
  }
`,d=({name:r,logo:i})=>e.jsxs(p,{children:[e.jsx("img",{src:i||o,alt:"logo"}),e.jsx("div",{className:"chain-name-wrapper",children:e.jsx("span",{className:"chain-name",children:r})})]});d.__docgenInfo={description:"",methods:[],displayName:"ApproveChangingNetworkItem",props:{name:{required:!0,tsType:{name:"string"},description:""},logo:{required:!1,tsType:{name:"string"},description:""}}};export{d as A};
