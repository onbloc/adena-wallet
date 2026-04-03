import{m as d,j as e}from"./global-style-Be4sOX77.js";import{I as r}from"./icon-empty-image-BxaLFB1D.js";import{a as l,R as c}from"./index-Ct-w3XHB.js";import{V as g}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{d as a,g as u,r as h}from"./theme-D2qI5cuM.js";const i=a(g)`
  width: 100%;
  height: 100%;
  background-color: ${u("neutral","_7")};
  align-items: center;
  justify-content: center;

  .empty-image {
    width: 31px;
    height: auto;
  }

  .nft-image {
    width: auto;
    height: auto;
    min-width: 100%;
    min-height: 100%;
    object-fit: cover;
  }
`,f=a(l)`
  ${d.flex({align:"flex-end",justify:"space-between"})}
  width: 100%;
  flex: 1;
  height: 100%;
  padding: 10px;
`,x=({isFetched:o,image:t,hasBadge:s=!1})=>{const[m,n]=h.useState(!1),p=()=>{n(!0)};return o?!t||m?e.jsx(i,{className:"empty",children:e.jsx("img",{className:"empty-image",src:r,alt:"empty image"})}):e.jsx(i,{children:e.jsx("img",{className:"nft-image",src:t||r,onError:p,alt:"nft image"})}):e.jsx(f,{children:s&&e.jsx(c,{width:"132px",height:"20px",radius:"10px",margin:"0 auto"})})};x.__docgenInfo={description:"",methods:[],displayName:"NFTCardImage",props:{isFetched:{required:!0,tsType:{name:"boolean"},description:""},image:{required:!0,tsType:{name:"union",raw:"string | null | undefined",elements:[{name:"string"},{name:"null"},{name:"undefined"}]},description:""},hasBadge:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};export{x as N};
