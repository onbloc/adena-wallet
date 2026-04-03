import{m as o,j as n}from"./global-style-Be4sOX77.js";import{I as R}from"./icon-pin-tRAZew7m.js";import{N as U}from"./nft-card-image-CwvWFIjY.js";import{B as T}from"./bignumber-B1z4pYDt.js";import{f as g,g as i,d as l,r as t}from"./theme-D2qI5cuM.js";import{a as j}from"./index-Ct-w3XHB.js";import{V as h}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";const M=l(h)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;

  .info-static-wrapper {
    ${o.flex({direction:"row",align:"center",justify:"space-between"})}
    position: absolute;
    top: 10px;
    width: 132px;
    flex-shrink: 0;
    height: 20px;
    padding: 0 5px 0 8px;
    gap: 4px;
    flex-shrink: 0;
    align-self: center;
    border-radius: 10px;
    background-color: ${i("neutral","_9")};
    cursor: default;

    .pin-wrapper {
      ${o.flex({direction:"column",align:"center",justify:"center"})}
      width: 10px;
      height: 10px;
      cursor: pointer;

      .icon-pin {
        path {
          transition: 0.2s;
          fill: ${i("neutral","_5")};
        }

        &:hover,
        &.pinned.pinned {
          path {
            fill: ${i("neutral","_1")};
          }
        }
      }
    }

    .name-wrapper {
      display: inline-block;
      width: 100%;
      ${g.captionBold}
      text-align: center;
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .balance-wrapper {
      ${o.flex({direction:"column",align:"flex-end",justify:"flex-end"})}
      width: auto;
      flex-shrink: 0;
      color: ${i("neutral","a")};
      ${g.light1Bold};
    }
  }
`;l(h)`
  width: 100%;
  height: 100%;
  background-color: ${i("neutral","_7")};
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
`;l(j)`
  ${o.flex({align:"flex-end",justify:"space-between"})}
  width: 100%;
  flex: 1;
  height: 100%;
  padding: 10px;
`;const N=({grc721Collection:e,exitsPinnedCollections:u,pin:p,unpin:m,queryGRC721TokenUri:f,queryGRC721Balance:y,moveCollectionPage:d})=>{const{data:w,isFetched:c}=f(e.packagePath,e.tokenId,{enabled:e.isTokenUri}),{data:a}=y(e.packagePath,{refetchOnMount:!0}),x=t.useMemo(()=>e.isTokenUri?c:!0,[e,c]),k=t.useMemo(()=>`${e.name}`,[e.name]),b=t.useMemo(()=>a==null?"":T(a).toFormat(),[a]),s=t.useMemo(()=>u(e),[e,u]),C=t.useCallback(r=>{if(r.preventDefault(),r.stopPropagation(),s){m(e);return}p(e)},[s,p,m]),v=t.useCallback(()=>{d(e)},[e,d]);return n.jsxs(M,{onClick:v,children:[n.jsx(U,{image:w,isFetched:x,hasBadge:!0}),n.jsxs("div",{className:"info-static-wrapper",onClick:r=>{r.preventDefault(),r.stopPropagation()},children:[n.jsx("div",{className:"pin-wrapper",onClick:C,children:n.jsx(R,{className:s?"icon-pin pinned":"icon-pin"})}),n.jsx("div",{className:"name-wrapper",children:k}),n.jsx("div",{className:"balance-wrapper",children:b})]})]})};N.__docgenInfo={description:"",methods:[],displayName:"NFTCollectionCard",props:{grc721Collection:{required:!0,tsType:{name:"GRC721CollectionModel"},description:""},exitsPinnedCollections:{required:!0,tsType:{name:"signature",type:"function",raw:"(collection: GRC721CollectionModel) => boolean",signature:{arguments:[{type:{name:"GRC721CollectionModel"},name:"collection"}],return:{name:"boolean"}}},description:""},queryGRC721TokenUri:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},queryGRC721Balance:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<number | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]}],raw:"UseQueryResult<number | null>"}}},description:""},pin:{required:!0,tsType:{name:"signature",type:"function",raw:"(collection: GRC721CollectionModel) => void",signature:{arguments:[{type:{name:"GRC721CollectionModel"},name:"collection"}],return:{name:"void"}}},description:""},unpin:{required:!0,tsType:{name:"signature",type:"function",raw:"(collection: GRC721CollectionModel) => void",signature:{arguments:[{type:{name:"GRC721CollectionModel"},name:"collection"}],return:{name:"void"}}},description:""},moveCollectionPage:{required:!0,tsType:{name:"signature",type:"function",raw:"(collection: GRC721CollectionModel) => void",signature:{arguments:[{type:{name:"GRC721CollectionModel"},name:"collection"}],return:{name:"void"}}},description:""}}};export{N};
