import{j as t,m as h}from"./global-style-Be4sOX77.js";import{g as m,d as f,r as i}from"./theme-D2qI5cuM.js";const p=()=>t.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M6.0557 1.99978L12.5558 1.99978C12.9389 1.99978 13.3063 2.15197 13.5771 2.42285C13.848 2.69374 14.0002 3.06115 14.0002 3.44424L14.0002 9.9443M11.389 6.05549L11.389 12.5555C11.389 13.3533 10.7423 14 9.94451 14L3.44446 14C2.64671 14 2 13.3533 2 12.5555L2 6.05549C2 5.25774 2.64671 4.61103 3.44446 4.61103L9.94451 4.61103C10.7423 4.61103 11.389 5.25774 11.389 6.05549Z",stroke:"white",strokeWidth:"1.2",strokeLinecap:"round",strokeLinejoin:"round"})});p.__docgenInfo={description:"",methods:[],displayName:"IconCopy"};const d=()=>t.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M3 7.5L6.33333 12L13 3",stroke:"white",strokeWidth:"1.2",strokeLinecap:"round",strokeLinejoin:"round"})});d.__docgenInfo={description:"",methods:[],displayName:"iconCopyCheck"};const g=f.div`
  ${h.flex({align:"normal",justify:"normal"})};
  width: ${({size:e})=>`${e}px`};
  height: ${({size:e})=>`${e}px`};
  cursor: pointer;

  svg {
    width: ${({size:e})=>`${e}px`};
    height: ${({size:e})=>`${e}px`};
    path {
      transition: 0.2s;
      stroke: ${({theme:e,checked:o})=>o?e.neutral._1:e.neutral.a};
    }
  }

  &:hover svg {
    path {
      stroke: ${m("neutral","_1")};
    }
  }
`,x=({className:e="",copyText:o,style:c={},size:u=16,onClick:n})=>{const[s,a]=i.useState(!1);i.useEffect(()=>{const r=setTimeout(()=>a(!1),2e3);return()=>{clearTimeout(r)}},[s]);const l=i.useCallback(r=>{r.preventDefault(),r.stopPropagation(),a(!0),navigator.clipboard.writeText(o),n&&n()},[o,s,n]);return t.jsx(g,{className:e,style:c,size:u,checked:s,onClick:l,children:s?t.jsx(d,{}):t.jsx(p,{})})};x.__docgenInfo={description:"",methods:[],displayName:"CopyIconButton",props:{className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}},copyText:{required:!0,tsType:{name:"string"},description:""},style:{required:!1,tsType:{name:"ReactCSSProperties",raw:"React.CSSProperties"},description:"",defaultValue:{value:`{
}`,computed:!1}},size:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"16",computed:!1}},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{x as C};
