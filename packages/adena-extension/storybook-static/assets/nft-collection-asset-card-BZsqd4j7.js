import{m as s,j as r}from"./global-style-Be4sOX77.js";import{N as c}from"./nft-card-image-CwvWFIjY.js";import{f as a,g,d as h,r as t}from"./theme-D2qI5cuM.js";import"./index-Ct-w3XHB.js";import{V as f}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";const x=h(f)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;

  .info-static-wrapper {
    ${s.flex({direction:"row",align:"center",justify:"center"})}
    position: absolute;
    top: 10px;
    width: 132px;
    flex-shrink: 0;
    height: 20px;
    padding: 0 7px;
    gap: 2px;
    flex-shrink: 0;
    align-self: center;
    border-radius: 10px;
    background-color: ${g("neutral","_9")};

    .name-wrapper {
      display: inline-block;
      width: auto;
      ${a.captionBold}
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .id-wrapper {
      ${s.flex({direction:"column",align:"flex-end",justify:"flex-end"})}
      width: auto;
      flex-shrink: 0;
      ${a.captionBold}
    }
  }
`,w=({grc721Token:e,queryGRC721TokenUri:o,moveAssetPage:n})=>{const{data:p,isFetched:i}=o(e.packagePath,e.tokenId,{enabled:e.isTokenUri}),l=t.useMemo(()=>e.isTokenUri?i:!0,[e,i]),d=t.useMemo(()=>`${e.name}`,[e.name]),m=t.useMemo(()=>`#${e.tokenId}`,[e.tokenId]),u=t.useCallback(()=>{n(e)},[e,n]);return r.jsxs(x,{onClick:u,children:[r.jsx(c,{image:p,isFetched:l,hasBadge:!0}),r.jsxs("div",{className:"info-static-wrapper",children:[r.jsx("div",{className:"name-wrapper",children:d}),r.jsx("div",{className:"id-wrapper",children:m})]})]})};w.__docgenInfo={description:"",methods:[],displayName:"NFTCollectionAssetCard",props:{grc721Token:{required:!0,tsType:{name:"GRC721Model"},description:""},queryGRC721TokenUri:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},moveAssetPage:{required:!0,tsType:{name:"signature",type:"function",raw:"(grc721Token: GRC721Model) => void",signature:{arguments:[{type:{name:"GRC721Model"},name:"grc721Token"}],return:{name:"void"}}},description:""}}};export{w as N};
