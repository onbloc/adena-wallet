import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,g as r,rt as i,t as a}from"./iframe-DekVl-_p.js";import{t as o}from"./atoms-DPNcwsZr.js";import{r as s}from"./base-D2xGt4mF.js";import{n as c,t as l}from"./nft-card-image-KqCZlPkl.js";var u,d=t((()=>{o(),n(),u=r(s)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
`})),f,p,m,h=t((()=>{c(),f=e(i()),d(),p=a(),m=({asset:e,queryGRC721TokenUri:t})=>{let{data:n,isFetched:r}=t(e.packagePath,e.tokenId,{enabled:e.isTokenUri,refetchOnMount:!0});return(0,p.jsx)(u,{children:(0,p.jsx)(l,{image:n,isFetched:(0,f.useMemo)(()=>e.isTokenUri?!0:r,[e,r])})})},m.__docgenInfo={description:``,methods:[],displayName:`NFTAssetImageCard`,props:{asset:{required:!0,tsType:{name:`GRC721Model`},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: Omit<UseQueryOptions<string | null, Error>, 'queryKey' | 'queryFn'>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`Omit`,elements:[{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},{name:`union`,raw:`'queryKey' | 'queryFn'`,elements:[{name:`literal`,value:`'queryKey'`},{name:`literal`,value:`'queryFn'`}]}],raw:`Omit<UseQueryOptions<string | null, Error>, 'queryKey' | 'queryFn'>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``}}}}));export{h as n,m as t};