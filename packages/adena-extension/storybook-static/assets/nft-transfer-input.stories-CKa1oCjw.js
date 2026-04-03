import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,rt as a,s as o,t as s}from"./iframe-BclzClxJ.js";import{t as c}from"./atoms-kch4SvDy.js";import{a as l,o as u,t as d}from"./sub-header-CtopHkw-.js";import{h as f,r as p}from"./approve-ledger-loading-BtJ73zaA.js";import{n as m,t as h}from"./nft-asset-image-card-DL4lJBU8.js";import{n as g,t as _}from"./address-input-Bz8f4uvH.js";import{n as v,t as y}from"./memo-input-CkYX4B3y.js";var b,x=e((()=>{o(),n(),b=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  position: relative;
  width: 100%;
  width: 100%;
  height: auto;
  padding: 24px 20px 96px;

  .asset-card-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 25px auto 30px;
    width: 100px;
  }

  .address-input-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .balance-input-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .memo-input-wrapper {
    display: flex;
    padding-bottom: 20px;
  }
`})),S,C,w,T=e((()=>{u(),c(),p(),m(),g(),v(),S=t(a()),x(),C=s(),w=({grc721Token:e,addressInput:t,memoInput:n,hasBackButton:r,isNext:i,queryGRC721TokenUri:a,onClickBack:o,onClickCancel:s,onClickNext:c})=>{let u=(0,S.useMemo)(()=>`Send ${e.name} #${e.tokenId}`,[e]);return(0,C.jsxs)(b,{children:[r?(0,C.jsx)(d,{title:u,leftElement:{element:(0,C.jsx)(`img`,{src:`${l}`,alt:`back image`}),onClick:o}}):(0,C.jsx)(d,{title:u}),(0,C.jsx)(`div`,{className:`asset-card-wrapper`,children:(0,C.jsx)(h,{asset:e,queryGRC721TokenUri:a})}),(0,C.jsx)(`div`,{className:`address-input-wrapper`,children:(0,C.jsx)(_,{...t})}),(0,C.jsx)(`div`,{className:`memo-input-wrapper`,children:(0,C.jsx)(y,{...n})}),(0,C.jsx)(f,{leftButton:{text:`Cancel`,onClick:s},rightButton:{text:`Next`,onClick:c,disabled:!i,primary:!0},filled:!0})]})},w.__docgenInfo={description:``,methods:[],displayName:`NFTTransferInput`,props:{grc721Token:{required:!0,tsType:{name:`GRC721Model`},description:``},addressInput:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  opened: boolean
  hasError: boolean
  selected: boolean
  selectedName: string
  selectedDescription: string
  address: string
  errorMessage?: string
  addressBookInfos: {
    addressBookId: string
    name: string
    description: string
  }[]
  onClickInputIcon: (selected: boolean) => void
  onChangeAddress: (address: string) => void
  onClickAddressBook: (addressBookId: string) => void
}`,signature:{properties:[{key:`opened`,value:{name:`boolean`,required:!0}},{key:`hasError`,value:{name:`boolean`,required:!0}},{key:`selected`,value:{name:`boolean`,required:!0}},{key:`selectedName`,value:{name:`string`,required:!0}},{key:`selectedDescription`,value:{name:`string`,required:!0}},{key:`address`,value:{name:`string`,required:!0}},{key:`errorMessage`,value:{name:`string`,required:!1}},{key:`addressBookInfos`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{
  addressBookId: string
  name: string
  description: string
}`,signature:{properties:[{key:`addressBookId`,value:{name:`string`,required:!0}},{key:`name`,value:{name:`string`,required:!0}},{key:`description`,value:{name:`string`,required:!0}}]}}],raw:`{
  addressBookId: string
  name: string
  description: string
}[]`,required:!0}},{key:`onClickInputIcon`,value:{name:`signature`,type:`function`,raw:`(selected: boolean) => void`,signature:{arguments:[{type:{name:`boolean`},name:`selected`}],return:{name:`void`}},required:!0}},{key:`onChangeAddress`,value:{name:`signature`,type:`function`,raw:`(address: string) => void`,signature:{arguments:[{type:{name:`string`},name:`address`}],return:{name:`void`}},required:!0}},{key:`onClickAddressBook`,value:{name:`signature`,type:`function`,raw:`(addressBookId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`addressBookId`}],return:{name:`void`}},required:!0}}]}},description:``},memoInput:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  memo: string
  memoError?: BaseError | null
  onChangeMemo: (memo: string) => void
}`,signature:{properties:[{key:`memo`,value:{name:`string`,required:!0}},{key:`memoError`,value:{name:`union`,raw:`BaseError | null`,elements:[{name:`BaseError`},{name:`null`}],required:!1}},{key:`onChangeMemo`,value:{name:`signature`,type:`function`,raw:`(memo: string) => void`,signature:{arguments:[{type:{name:`string`},name:`memo`}],return:{name:`void`}},required:!0}}]}},description:``},isNext:{required:!0,tsType:{name:`boolean`},description:``},hasBackButton:{required:!0,tsType:{name:`boolean`},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},onClickBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickNext:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),E,D,O,k;e((()=>{T(),{action:E}=__STORYBOOK_MODULE_ACTIONS__,D={title:`components/transfer/NFTTransferInput`,component:w},O={args:{grc721Token:{metadata:null,name:``,networkId:``,packagePath:``,symbol:``,tokenId:``,type:`grc721`,isMetadata:!0,isTokenUri:!0},addressInput:{opened:!1,hasError:!1,errorMessage:`Invalid address`,selected:!1,selectedName:``,selectedDescription:`(g1ff...jpae)`,address:``,addressBookInfos:[],onClickInputIcon:E(`click input icon`),onChangeAddress:E(`change address`),onClickAddressBook:E(`click address book`)},memoInput:{memo:``,onChangeMemo:E(`onChangeMemo`)},isNext:!0,hasBackButton:!0,onClickBack:E(`click back`),onClickCancel:E(`click cancel`),onClickNext:E(`click next`)}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    grc721Token: {
      metadata: null,
      name: '',
      networkId: '',
      packagePath: '',
      symbol: '',
      tokenId: '',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true
    },
    addressInput: {
      opened: false,
      hasError: false,
      errorMessage: 'Invalid address',
      selected: false,
      selectedName: '',
      selectedDescription: '(g1ff...jpae)',
      address: '',
      addressBookInfos: [],
      onClickInputIcon: action('click input icon'),
      onChangeAddress: action('change address'),
      onClickAddressBook: action('click address book')
    },
    memoInput: {
      memo: '',
      onChangeMemo: action('onChangeMemo')
    },
    isNext: true,
    hasBackButton: true,
    onClickBack: action('click back'),
    onClickCancel: action('click cancel'),
    onClickNext: action('click next')
  }
}`,...O.parameters?.docs?.source}}},k=[`Default`]}))();export{O as Default,k as __namedExportsOrder,D as default};