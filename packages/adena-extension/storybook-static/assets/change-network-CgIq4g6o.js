import{j as t,m as r}from"./global-style-Be4sOX77.js";import{i as g}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{A as x}from"./add-custom-network-button-Dxj78ABq.js";import{R as o,a as c}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{d as i}from"./theme-D2qI5cuM.js";import{N as l}from"./network-list-DFAbUk19.js";const h=i.div`
  ${r.flex({align:"flex-start",justify:"flex-start"})};
  position: relative;
  width: 100%;
  margin-top: 13px;
  gap: 12px;
`,w=i(c)`
  ${r.flex({align:"flex-start"})}
  width: 100%;
  height: 60px;
`,a=()=>t.jsx(h,{children:Array.from({length:4},(n,e)=>t.jsxs(w,{children:[t.jsx(o,{width:"58px",height:"10px",radius:"24px"}),t.jsx(o,{width:"134px",height:"10px",radius:"24px",margin:"10px 0px 0px"})]},e))});a.__docgenInfo={description:"",methods:[],displayName:"LoadingChangeNetwork"};const f=i.div`
  ${r.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;

  .content-wrapper {
    padding: 12px 20px;
    margin-bottom: 78px;

    .title {
      margin: 12px 0;
    }
  }
`,k=({loading:n,currentNetworkId:e,networkMetainfos:s,changeNetwork:p,moveAddPage:m,moveEditPage:d,moveBack:u})=>t.jsxs(f,{children:[t.jsxs("div",{className:"content-wrapper",children:[t.jsx("h4",{className:"title",children:"Change Network"}),n?t.jsx(a,{}):t.jsxs(t.Fragment,{children:[t.jsx(l,{currentNetworkId:e,networkMetainfos:s,changeNetwork:p,moveEditPage:d}),t.jsx(x,{onClick:m})]})]}),t.jsx(g,{onClick:u})]});k.__docgenInfo={description:"",methods:[],displayName:"ChangeNetwork",props:{loading:{required:!0,tsType:{name:"boolean"},description:""},currentNetworkId:{required:!0,tsType:{name:"string"},description:""},networkMetainfos:{required:!0,tsType:{name:"Array",elements:[{name:"NetworkMetainfo"}],raw:"NetworkMetainfo[]"},description:""},changeNetwork:{required:!0,tsType:{name:"signature",type:"function",raw:"(networkMetainfoId: string) => void",signature:{arguments:[{type:{name:"string"},name:"networkMetainfoId"}],return:{name:"void"}}},description:""},moveAddPage:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},moveEditPage:{required:!0,tsType:{name:"signature",type:"function",raw:"(networkMetainfoId: string) => void",signature:{arguments:[{type:{name:"string"},name:"networkMetainfoId"}],return:{name:"void"}}},description:""},moveBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{k as C};
