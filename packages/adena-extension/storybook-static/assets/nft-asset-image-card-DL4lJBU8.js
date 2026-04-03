import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,g as r,rt as i,t as a}from"./iframe-BclzClxJ.js";import{t as o}from"./atoms-kch4SvDy.js";import{r as s}from"./base-Cfud_vLb.js";import{n as c,t as l}from"./nft-card-image-BvtmxlQY.js";var u,d=e((()=>{o(),n(),u=r(s)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
`})),f,p,m,h=e((()=>{c(),f=t(i()),d(),p=a(),m=({asset:e,queryGRC721TokenUri:t})=>{let{data:n,isFetched:r}=t(e.packagePath,e.tokenId,{enabled:e.isTokenUri,refetchOnMount:!0});return(0,p.jsx)(u,{children:(0,p.jsx)(l,{image:n,isFetched:(0,f.useMemo)(()=>e.isTokenUri?!0:r,[e,r])})})},m.__docgenInfo={description:``,methods:[],displayName:`NFTAssetImageCard`,props:{asset:{required:!0,tsType:{name:`GRC721Model`},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``}}}}));export{h as n,m as t};