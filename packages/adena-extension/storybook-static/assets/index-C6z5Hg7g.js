import{m as o,j as a}from"./global-style-Be4sOX77.js";import{g as e,d as t}from"./theme-D2qI5cuM.js";const n=t.div`
  ${o.flex({align:"normal",justify:"normal"})};
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  padding: 3px;
  border-radius: 100px;
  background-color: ${e("neutral","_5")};
  transition: 0.2s;
  cursor: pointer;

  .circle {
    display: block;
    width: 20px;
    height: 20px;
    background-color: ${e("neutral","_1")};
    border-radius: 20px;
    transition: 0.2s;
  }

  &.activated {
    background-color: ${e("primary","_7")};

    .circle {
      margin-left: 20px;
    }
  }
`,s=({activated:r,onToggle:i})=>a.jsx(n,{className:r?"activated":"",onClick:()=>i(!r),children:a.jsx("div",{className:"circle"})});s.__docgenInfo={description:"",methods:[],displayName:"Toggle",props:{activated:{required:!0,tsType:{name:"boolean"},description:""},onToggle:{required:!0,tsType:{name:"signature",type:"function",raw:"(activated: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"activated"}],return:{name:"void"}}},description:""}}};export{s as T};
