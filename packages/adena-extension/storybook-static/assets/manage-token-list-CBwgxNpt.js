import{m as h,j as n}from"./global-style-Be4sOX77.js";import{d as x,f as d,g as p,n as k,r as g}from"./theme-D2qI5cuM.js";import{I as U}from"./icon-empty-image-BxaLFB1D.js";import{T as y}from"./index-C6z5Hg7g.js";import{B as j}from"./bignumber-B1z4pYDt.js";import{T as R}from"./index-VyJW6yi1.js";const Q=x.div`
  ${h.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
`,f=x.div`
  ${h.flex({direction:"row",justify:"flex-start"})};
  padding: 10px 14px;
  width: 100%;
  height: auto;
  background: ${p("neutral","_9")};
  border-radius: 18px;
  transition: 0.2s;

  & + & {
    margin-top: 12px;
  }

  .logo-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    margin-right: 12px;

    .logo {
      width: 100%;
      height: 100%;
      border-radius: 50%;

      &.empty {
        background-color: ${p("neutral","_7")};
      }
    }

    .icon-empty {
      display: block;
      width: 20px;
      height: 100%;
      margin: auto;
    }

    &.square {
      .logo {
        border-radius: 8px;
      }
    }
  }

  .name-wrapper {
    display: inline-flex;
    flex-direction: column;
    margin-top: 4px;
    height: 35px;
    white-space: pre;
    justify-content: space-between;

    .name {
      ${d.body2Bold};
      line-height: 15px;
    }

    .balance {
      color: ${p("neutral","a")};
      ${d.captionReg};
    }
  }

  .toggle-wrapper {
    display: inline-flex;
    width: 100%;
    height: auto;
    align-items: flex-start;
    justify-content: flex-end;
  }
`;function v(e){return e.type==="token"}const w=({token:e,queryGRC721TokenUri:a,queryGRC721Balance:r,onToggleActiveItem:t})=>{const l=k(),[m,b]=g.useState(!1),s=v(e),i=!s&&e.isTokenUri&&a?a(e.packagePath,"0",{enabled:!!e.isTokenUri}):null,o=!s&&r?r(e.packagePath,{refetchOnMount:!0}):null,c=g.useMemo(()=>!m||!i||!i.data?null:i.data,[i]),I=g.useMemo(()=>{if(s)return"";if(o===null||o.data===void 0||o.data===null)return"-";const u=j(o.data);return u.isGreaterThan(1)?`${u.toFormat()} Items`:`${u.toFormat()} Item`},[e]),T=()=>{b(!0)};return s?n.jsxs(f,{children:[n.jsx("div",{className:"logo-wrapper",children:n.jsx("img",{className:"logo",src:e.logo,alt:"token img",onError:T})}),n.jsxs("div",{className:"name-wrapper",children:[n.jsx("span",{className:"name",children:e.name}),n.jsx(R,{value:e.balance.value,denom:e.balance.denom,orientation:"HORIZONTAL",fontColor:l.neutral.a,fontStyleKey:"captionReg",minimumFontSize:"10px"})]}),n.jsx("div",{className:"toggle-wrapper",children:!e.main&&n.jsx(y,{activated:e.display===!0,onToggle:()=>t(e.tokenId,!e.display)})})]}):n.jsxs(f,{children:[n.jsx("div",{className:"logo-wrapper square",children:c?n.jsx("img",{className:"logo",src:c,alt:"token img"}):n.jsx("div",{className:"logo empty",children:n.jsx("img",{className:"icon-empty",src:U,alt:"token empty"})})}),n.jsxs("div",{className:"name-wrapper",children:[n.jsx("span",{className:"name",children:e.name}),n.jsx("span",{className:"balance",children:I})]}),n.jsx("div",{className:"toggle-wrapper",children:n.jsx(y,{activated:e.display===!0,onToggle:()=>t(e.packagePath,!e.display)})})]})};w.__docgenInfo={description:"",methods:[],displayName:"ManageTokenListItem",props:{token:{required:!0,tsType:{name:"union",raw:"ManageTokenInfo | ManageGRC721Info",elements:[{name:"ManageTokenInfo"},{name:"ManageGRC721Info"}]},description:""},queryGRC721TokenUri:{required:!1,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},queryGRC721Balance:{required:!1,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<number | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]}],raw:"UseQueryResult<number | null>"}}},description:""},onToggleActiveItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(tokenId: string, activated: boolean) => void",signature:{arguments:[{type:{name:"string"},name:"tokenId"},{type:{name:"boolean"},name:"activated"}],return:{name:"void"}}},description:""}}};const M=({tokens:e,queryGRC721TokenUri:a,queryGRC721Balance:r,onToggleActiveItem:t})=>n.jsx(Q,{children:e.map((l,m)=>n.jsx(w,{token:l,onToggleActiveItem:t,queryGRC721TokenUri:a,queryGRC721Balance:r},m))});M.__docgenInfo={description:"",methods:[],displayName:"ManageTokenList",props:{tokens:{required:!0,tsType:{name:"union",raw:"ManageTokenInfo[] | ManageGRC721Info[]",elements:[{name:"Array",elements:[{name:"ManageTokenInfo"}],raw:"ManageTokenInfo[]"},{name:"Array",elements:[{name:"ManageGRC721Info"}],raw:"ManageGRC721Info[]"}]},description:""},queryGRC721TokenUri:{required:!1,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},queryGRC721Balance:{required:!1,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<number | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]}],raw:"UseQueryResult<number | null>"}}},description:""},onToggleActiveItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(tokenId: string, activated: boolean) => void",signature:{arguments:[{type:{name:"string"},name:"tokenId"},{type:{name:"boolean"},name:"activated"}],return:{name:"void"}}},description:""}}};export{M};
