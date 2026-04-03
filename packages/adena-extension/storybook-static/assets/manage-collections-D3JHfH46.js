import{m as l,j as e}from"./global-style-Be4sOX77.js";import{M as m}from"./manage-token-list-CBwgxNpt.js";import{M as p}from"./manage-collection-search-input-CbUO_XsB.js";import{f as d,g as n,d as g}from"./theme-D2qI5cuM.js";const c=g.div`
  ${l.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;

  .list-wrapper {
    display: flex;
    margin-top: 24px;
    max-height: 284px;
    overflow-y: auto;
    padding-bottom: 24px;
  }

  .close-wrapper {
    position: absolute;
    display: flex;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 96px;
    padding: 24px 20px;
    box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);

    .close {
      width: 100%;
      height: 100%;
      background-color: ${n("neutral","_5")};
      border-radius: 30px;
      ${d.body1Bold};
      transition: 0.2s;

      &:hover {
        background-color: ${n("neutral","_6")};
      }
    }
  }
`,y=({keyword:r,collections:t,queryGRC721TokenUri:a,queryGRC721Balance:s,onClickClose:i,onChangeKeyword:o,onToggleActiveItem:u})=>e.jsxs(c,{children:[e.jsxs("div",{className:"content-wrapper",children:[e.jsx("div",{className:"input-wrapper",children:e.jsx(p,{keyword:r,onChangeKeyword:o})}),e.jsx("div",{className:"list-wrapper",children:e.jsx(m,{tokens:t,queryGRC721TokenUri:a,queryGRC721Balance:s,onToggleActiveItem:u})})]}),e.jsx("div",{className:"close-wrapper",children:e.jsx("button",{className:"close",onClick:i,children:"Close"})})]});y.__docgenInfo={description:"",methods:[],displayName:"ManageCollections",props:{keyword:{required:!0,tsType:{name:"string"},description:""},collections:{required:!0,tsType:{name:"Array",elements:[{name:"ManageGRC721Info"}],raw:"ManageGRC721Info[]"},description:""},onClickClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},queryGRC721TokenUri:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},queryGRC721Balance:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<number | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]}],raw:"UseQueryResult<number | null>"}}},description:""},onChangeKeyword:{required:!0,tsType:{name:"signature",type:"function",raw:"(keyword: string) => void",signature:{arguments:[{type:{name:"string"},name:"keyword"}],return:{name:"void"}}},description:""},onToggleActiveItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(tokenId: string, activated: boolean) => void",signature:{arguments:[{type:{name:"string"},name:"tokenId"},{type:{name:"boolean"},name:"activated"}],return:{name:"void"}}},description:""}}};export{y as M};
