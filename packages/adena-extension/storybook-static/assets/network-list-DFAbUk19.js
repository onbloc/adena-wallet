import{m as s,j as t}from"./global-style-Be4sOX77.js";import{N as m}from"./network-list-item-DMNz1oSY.js";import{d}from"./theme-D2qI5cuM.js";const p=d.div`
  ${s.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;

  & > div {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }
`,u=({currentNetworkId:r,networkMetainfos:i,changeNetwork:n,moveEditPage:o})=>t.jsx(p,{children:i.map((e,a)=>t.jsx(m,{selected:e.id===r,locked:e.default===!0,networkMetainfo:e,changeNetwork:n,moveEditPage:o},a))});u.__docgenInfo={description:"",methods:[],displayName:"NetworkList",props:{currentNetworkId:{required:!0,tsType:{name:"string"},description:""},networkMetainfos:{required:!0,tsType:{name:"Array",elements:[{name:"NetworkMetainfo"}],raw:"NetworkMetainfo[]"},description:""},changeNetwork:{required:!0,tsType:{name:"signature",type:"function",raw:"(networkMetainfoId: string) => void",signature:{arguments:[{type:{name:"string"},name:"networkMetainfoId"}],return:{name:"void"}}},description:""},moveEditPage:{required:!0,tsType:{name:"signature",type:"function",raw:"(networkMetainfoId: string) => void",signature:{arguments:[{type:{name:"string"},name:"networkMetainfoId"}],return:{name:"void"}}},description:""}}};export{u as N};
