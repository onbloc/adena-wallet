import{m as o,j as e}from"./global-style-Be4sOX77.js";import{f as n,g as a,d,r as m,R as u}from"./theme-D2qI5cuM.js";import"./index-Ct-w3XHB.js";import{V as c}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";const x=d(c)`
  width: 100%;
  height: auto;
  flex-shrink: 0;
  margin-top: 8px;
  gap: 20px;

  .title {
    color: ${a("neutral","_2")};
    ${n.body1Reg};
  }

  .content {
    color: ${a("neutral","a")};
    ${n.body2Reg};
  }

  .content-wrapper,
  .attribute-wrapper {
    ${o.flex({direction:"column",align:"flex-start",justify:"flex-start"})};
    gap: 8px;
  }

  .attribute-wrapper {
    flex-flow: wrap;
  }

  .trait-wrapper {
    ${o.flex({direction:"column",align:"flex-start",justify:"flex-start"})};
    width: auto;
    max-width: 100%;
    height: auto;
    padding: 5px 10px;
    gap: 4px;
    background-color: ${a("neutral","_9")};
    border-radius: 8px;

    .trait-type {
      color: ${a("neutral","_5")};
      ${n.body2Reg};
    }

    .trait-value {
      color: ${a("neutral","_1")};
      ${n.body2Reg};
    }
  }
`,h=({asset:t,queryGRC721TokenMetadata:l})=>{const{data:r,isFetched:s}=l(t.packagePath,t.tokenId,{enabled:t.isMetadata,refetchOnMount:!0});return m.useMemo(()=>t.isMetadata?s&&!!r:!1,[t,r,s])?e.jsxs(x,{children:[e.jsxs("div",{className:"content-wrapper",children:[e.jsx("span",{className:"title",children:"Description"}),e.jsx("span",{className:"content",children:r?.description})]}),e.jsxs("div",{className:"content-wrapper",children:[e.jsx("span",{className:"title",children:"Attributes"}),e.jsx("div",{className:"attribute-wrapper",children:r?.attributes.map((i,p)=>e.jsxs("div",{className:"trait-wrapper",children:[e.jsx("span",{className:"trait-type",children:i.traitType}),e.jsx("span",{className:"trait-value",children:i.value})]},p))})]})]}):e.jsx(u.Fragment,{})};h.__docgenInfo={description:"",methods:[],displayName:"NFTAssetMetadata",props:{asset:{required:!0,tsType:{name:"GRC721Model"},description:""},queryGRC721TokenMetadata:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<GRC721MetadataModel | null, Error>,
) => UseQueryResult<GRC721MetadataModel | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"GRC721MetadataModel | null",elements:[{name:"GRC721MetadataModel"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<GRC721MetadataModel | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"GRC721MetadataModel | null",elements:[{name:"GRC721MetadataModel"},{name:"null"}]}],raw:"UseQueryResult<GRC721MetadataModel | null>"}}},description:""}}};export{h as N};
