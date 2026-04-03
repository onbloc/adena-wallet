import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";import{t as d}from"./atoms-kch4SvDy.js";import{r as f}from"./base-Cfud_vLb.js";import{n as p,t as m}from"./nft-card-image-BvtmxlQY.js";var h,g=e((()=>{d(),l(),a(),n(),h=i(f)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;

  .info-static-wrapper {
    ${r.flex({direction:`row`,align:`center`,justify:`center`})}
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
    background-color: ${s(`neutral`,`_9`)};

    .name-wrapper {
      display: inline-block;
      width: auto;
      ${o.captionBold}
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .id-wrapper {
      ${r.flex({direction:`column`,align:`flex-end`,justify:`flex-end`})}
      width: auto;
      flex-shrink: 0;
      ${o.captionBold}
    }
  }
`})),_,v,y,b=e((()=>{p(),_=t(c()),g(),v=u(),y=({grc721Token:e,queryGRC721TokenUri:t,moveAssetPage:n})=>{let{data:r,isFetched:i}=t(e.packagePath,e.tokenId,{enabled:e.isTokenUri}),a=(0,_.useMemo)(()=>e.isTokenUri?i:!0,[e,i]),o=(0,_.useMemo)(()=>`${e.name}`,[e.name]),s=(0,_.useMemo)(()=>`#${e.tokenId}`,[e.tokenId]);return(0,v.jsxs)(h,{onClick:(0,_.useCallback)(()=>{n(e)},[e,n]),children:[(0,v.jsx)(m,{image:r,isFetched:a,hasBadge:!0}),(0,v.jsxs)(`div`,{className:`info-static-wrapper`,children:[(0,v.jsx)(`div`,{className:`name-wrapper`,children:o}),(0,v.jsx)(`div`,{className:`id-wrapper`,children:s})]})]})},y.__docgenInfo={description:``,methods:[],displayName:`NFTCollectionAssetCard`,props:{grc721Token:{required:!0,tsType:{name:`GRC721Model`},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},moveAssetPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(grc721Token: GRC721Model) => void`,signature:{arguments:[{type:{name:`GRC721Model`},name:`grc721Token`}],return:{name:`void`}}},description:``}}}}));export{b as n,y as t};