import{j as e}from"./global-style-Be4sOX77.js";import{T as u}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{L as d}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{g,d as c,n as y,r as n}from"./theme-D2qI5cuM.js";import{N as f}from"./nft-collection-asset-card-BZsqd4j7.js";const i=c.div`
  position: relative;
  display: grid;
  width: 100%;
  min-height: auto;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  .description {
    position: absolute;
    top: 139px;
    left: 0px;
    width: 100%;
    text-align: center;
  }

  .loading-wrapper {
    position: absolute;
    width: 100%;
    height: auto;
    top: 0;
    left: 0;
    background-color: ${g("neutral","_8")};
  }
`,h=({tokens:t,isFetchedTokens:r,queryGRC721TokenUri:o,moveAssetPage:s})=>{const a=y(),m=n.useMemo(()=>r?t===null:!0,[r,t]);return n.useMemo(()=>t?.length===0,[t])?e.jsx(i,{children:e.jsx(u,{className:"description",type:"body1Reg",color:a.neutral.a,children:"No NFTs to display"})}):e.jsxs(i,{children:[t?.map((p,l)=>e.jsx(f,{grc721Token:p,queryGRC721TokenUri:o,moveAssetPage:s},l)),m&&e.jsx("div",{className:"loading-wrapper",children:e.jsx(d,{})})]})};h.__docgenInfo={description:"",methods:[],displayName:"NFTCollectionAssets",props:{tokens:{required:!0,tsType:{name:"union",raw:"GRC721Model[] | null | undefined",elements:[{name:"Array",elements:[{name:"GRC721Model"}],raw:"GRC721Model[]"},{name:"null"},{name:"undefined"}]},description:""},isFetchedTokens:{required:!0,tsType:{name:"boolean"},description:""},queryGRC721TokenUri:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},moveAssetPage:{required:!0,tsType:{name:"signature",type:"function",raw:"(grc721Token: GRC721Model) => void",signature:{arguments:[{type:{name:"GRC721Model"},name:"grc721Token"}],return:{name:"void"}}},description:""}}};export{h as N};
