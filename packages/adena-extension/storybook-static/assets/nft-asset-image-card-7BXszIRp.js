import{j as t}from"./global-style-Be4sOX77.js";import{N as s}from"./nft-card-image-CwvWFIjY.js";import{d as a,r as m}from"./theme-D2qI5cuM.js";import"./index-Ct-w3XHB.js";import{V as p}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";const u=a(p)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
`,d=({asset:e,queryGRC721TokenUri:n})=>{const{data:i,isFetched:r}=n(e.packagePath,e.tokenId,{enabled:e.isTokenUri,refetchOnMount:!0}),o=m.useMemo(()=>e.isTokenUri?!0:r,[e,r]);return t.jsx(u,{children:t.jsx(s,{image:i,isFetched:o})})};d.__docgenInfo={description:"",methods:[],displayName:"NFTAssetImageCard",props:{asset:{required:!0,tsType:{name:"GRC721Model"},description:""},queryGRC721TokenUri:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""}}};export{d as N};
