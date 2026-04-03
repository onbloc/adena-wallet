import{j as e}from"./global-style-Be4sOX77.js";import{T as N}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{L as R}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{g as j,d as M,n as U,r as a}from"./theme-D2qI5cuM.js";import{M as d}from"./manage-collections-button-B8AQ6w-5.js";import{N as q}from"./nft-collection-card-CIehPK1X.js";const l=M.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 24px;

  &.non-items {
    padding-top: 151px;
  }

  .collection-wrapper {
    display: grid;
    width: 100%;
    min-height: auto;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .description {
    position: absolute;
    top: 139px;
    left: 0px;
    width: 100%;
    text-align: center;
  }

  .manage-collection-button-wrapper {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
  }

  .loading-wrapper {
    position: absolute;
    width: 100%;
    height: auto;
    top: 0;
    left: 0;
    background-color: ${j("neutral","_8")};
  }
`,Q=({isFetchedCollections:m,collections:o,isFetchedPinnedCollections:u,pinnedCollections:t,pin:g,unpin:y,queryGRC721TokenUri:f,queryGRC721Balance:h,moveCollectionPage:w,moveManageCollectionsPage:p})=>{const x=U(),C=a.useMemo(()=>!m||!u?!0:o===null,[m,u,o]),k=a.useMemo(()=>o?.length===0,[o]),i=a.useMemo(()=>o?.filter(n=>n.display),[o]),P=a.useMemo(()=>i?.filter(n=>n.display).length===0,[i]),T=a.useMemo(()=>{if(!Array.isArray(i))return i;if(!Array.isArray(t))return null;const n=t.map(r=>i.find(v=>v.packagePath===r)).filter(r=>!!r),s=i.filter(r=>!t.includes(r.packagePath));return[...n,...s]},[t,i]),b=a.useCallback(n=>t?t.findIndex(s=>s===n.packagePath)>-1:!1,[t]),c=a.useCallback(()=>{p()},[p]);return k?e.jsx(l,{children:e.jsx(N,{className:"description",type:"body1Reg",color:x.neutral.a,children:"No NFTs to display"})}):P?e.jsx(l,{className:"non-items",children:e.jsx(d,{onClick:c})}):e.jsxs(l,{children:[e.jsx("div",{className:"collection-wrapper",children:T?.map((n,s)=>e.jsx(q,{grc721Collection:n,pin:r=>{g(r.packagePath)},unpin:r=>{y(r.packagePath)},exitsPinnedCollections:b,queryGRC721Balance:h,queryGRC721TokenUri:f,moveCollectionPage:w},s))}),e.jsx("div",{className:"manage-collection-button-wrapper",children:e.jsx(d,{onClick:c})}),C&&e.jsx("div",{className:"loading-wrapper",children:e.jsx(R,{})})]})};Q.__docgenInfo={description:"",methods:[],displayName:"NFTCollections",props:{collections:{required:!0,tsType:{name:"union",raw:"GRC721CollectionModel[] | null | undefined",elements:[{name:"Array",elements:[{name:"GRC721CollectionModel"}],raw:"GRC721CollectionModel[]"},{name:"null"},{name:"undefined"}]},description:""},isFetchedCollections:{required:!0,tsType:{name:"boolean"},description:""},pinnedCollections:{required:!0,tsType:{name:"union",raw:"string[] | null | undefined",elements:[{name:"Array",elements:[{name:"string"}],raw:"string[]"},{name:"null"},{name:"undefined"}]},description:""},isFetchedPinnedCollections:{required:!0,tsType:{name:"boolean"},description:""},pin:{required:!0,tsType:{name:"signature",type:"function",raw:"(packagePath: string) => Promise<void>",signature:{arguments:[{type:{name:"string"},name:"packagePath"}],return:{name:"Promise",elements:[{name:"void"}],raw:"Promise<void>"}}},description:""},unpin:{required:!0,tsType:{name:"signature",type:"function",raw:"(packagePath: string) => Promise<void>",signature:{arguments:[{type:{name:"string"},name:"packagePath"}],return:{name:"Promise",elements:[{name:"void"}],raw:"Promise<void>"}}},description:""},queryGRC721TokenUri:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},queryGRC721Balance:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<number | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]}],raw:"UseQueryResult<number | null>"}}},description:""},moveCollectionPage:{required:!0,tsType:{name:"signature",type:"function",raw:"(collection: GRC721CollectionModel) => void",signature:{arguments:[{type:{name:"GRC721CollectionModel"},name:"collection"}],return:{name:"void"}}},description:""},moveManageCollectionsPage:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{Q as N};
