import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";import{t as d}from"./atoms-kch4SvDy.js";import{r as f}from"./base-Cfud_vLb.js";var p,m=e((()=>{d(),l(),a(),n(),p=i(f)`
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
`})),h,g,_,v=e((()=>{h=t(c()),m(),g=u(),_=({asset:e,queryGRC721TokenMetadata:t})=>{let{data:n,isFetched:r}=t(e.packagePath,e.tokenId,{enabled:e.isMetadata,refetchOnMount:!0});return(0,h.useMemo)(()=>e.isMetadata?r&&!!n:!1,[e,n,r])?(0,g.jsxs)(p,{children:[(0,g.jsxs)(`div`,{className:`content-wrapper`,children:[(0,g.jsx)(`span`,{className:`title`,children:`Description`}),(0,g.jsx)(`span`,{className:`content`,children:n?.description})]}),(0,g.jsxs)(`div`,{className:`content-wrapper`,children:[(0,g.jsx)(`span`,{className:`title`,children:`Attributes`}),(0,g.jsx)(`div`,{className:`attribute-wrapper`,children:n?.attributes.map((e,t)=>(0,g.jsxs)(`div`,{className:`trait-wrapper`,children:[(0,g.jsx)(`span`,{className:`trait-type`,children:e.traitType}),(0,g.jsx)(`span`,{className:`trait-value`,children:e.value})]},t))})]})]}):(0,g.jsx)(h.Fragment,{})},_.__docgenInfo={description:``,methods:[],displayName:`NFTAssetMetadata`,props:{asset:{required:!0,tsType:{name:`GRC721Model`},description:``},queryGRC721TokenMetadata:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<GRC721MetadataModel | null, Error>,
) => UseQueryResult<GRC721MetadataModel | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`GRC721MetadataModel | null`,elements:[{name:`GRC721MetadataModel`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<GRC721MetadataModel | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`GRC721MetadataModel | null`,elements:[{name:`GRC721MetadataModel`},{name:`null`}]}],raw:`UseQueryResult<GRC721MetadataModel | null>`}}},description:``}}}})),y,b,x;e((()=>{v(),y={title:`components/nft-asset/NFTAssetMetadata`,component:_},b={args:{}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {}
}`,...b.parameters?.docs?.source}}},x=[`Default`]}))();export{b as Default,x as __namedExportsOrder,y as default};