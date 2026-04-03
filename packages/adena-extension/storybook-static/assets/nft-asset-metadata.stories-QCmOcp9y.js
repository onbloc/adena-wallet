import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-DekVl-_p.js";import{t as d}from"./atoms-DPNcwsZr.js";import{r as f}from"./base-D2xGt4mF.js";var p,m=t((()=>{d(),l(),a(),n(),p=i(f)`
  width: 100%;
  height: auto;
  flex-shrink: 0;
  margin-top: 8px;
  gap: 20px;

  .title {
    color: ${s(`neutral`,`_2`)};
    ${o.body1Reg};
  }

  .content {
    color: ${s(`neutral`,`a`)};
    ${o.body2Reg};
  }

  .content-wrapper,
  .attribute-wrapper {
    ${r.flex({direction:`column`,align:`flex-start`,justify:`flex-start`})};
    gap: 8px;
  }

  .attribute-wrapper {
    flex-flow: wrap;
  }

  .trait-wrapper {
    ${r.flex({direction:`column`,align:`flex-start`,justify:`flex-start`})};
    width: auto;
    max-width: 100%;
    height: auto;
    padding: 5px 10px;
    gap: 4px;
    background-color: ${s(`neutral`,`_9`)};
    border-radius: 8px;

    .trait-type {
      color: ${s(`neutral`,`_5`)};
      ${o.body2Reg};
    }

    .trait-value {
      color: ${s(`neutral`,`_1`)};
      ${o.body2Reg};
    }
  }
`})),h,g,_,v=t((()=>{h=e(c()),m(),g=u(),_=({asset:e,queryGRC721TokenMetadata:t})=>{let{data:n,isFetched:r}=t(e.packagePath,e.tokenId,{enabled:e.isMetadata,refetchOnMount:!0});return(0,h.useMemo)(()=>e.isMetadata?r&&!!n:!1,[e,n,r])?(0,g.jsxs)(p,{children:[(0,g.jsxs)(`div`,{className:`content-wrapper`,children:[(0,g.jsx)(`span`,{className:`title`,children:`Description`}),(0,g.jsx)(`span`,{className:`content`,children:n?.description})]}),(0,g.jsxs)(`div`,{className:`content-wrapper`,children:[(0,g.jsx)(`span`,{className:`title`,children:`Attributes`}),(0,g.jsx)(`div`,{className:`attribute-wrapper`,children:n?.attributes.map((e,t)=>(0,g.jsxs)(`div`,{className:`trait-wrapper`,children:[(0,g.jsx)(`span`,{className:`trait-type`,children:e.traitType}),(0,g.jsx)(`span`,{className:`trait-value`,children:e.value})]},t))})]})]}):(0,g.jsx)(h.Fragment,{})},_.__docgenInfo={description:``,methods:[],displayName:`NFTAssetMetadata`,props:{asset:{required:!0,tsType:{name:`GRC721Model`},description:``},queryGRC721TokenMetadata:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: Omit<UseQueryOptions<GRC721MetadataModel | null, Error>, 'queryKey' | 'queryFn'>,
) => UseQueryResult<GRC721MetadataModel | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`Omit`,elements:[{name:`UseQueryOptions`,elements:[{name:`union`,raw:`GRC721MetadataModel | null`,elements:[{name:`GRC721MetadataModel`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<GRC721MetadataModel | null, Error>`},{name:`union`,raw:`'queryKey' | 'queryFn'`,elements:[{name:`literal`,value:`'queryKey'`},{name:`literal`,value:`'queryFn'`}]}],raw:`Omit<UseQueryOptions<GRC721MetadataModel | null, Error>, 'queryKey' | 'queryFn'>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`GRC721MetadataModel | null`,elements:[{name:`GRC721MetadataModel`},{name:`null`}]}],raw:`UseQueryResult<GRC721MetadataModel | null>`}}},description:``}}}})),y,b,x;t((()=>{v(),y={title:`components/nft-asset/NFTAssetMetadata`,component:_},b={args:{}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {}
}`,...b.parameters?.docs?.source}}},x=[`Default`]}))();export{b as Default,x as __namedExportsOrder,y as default};