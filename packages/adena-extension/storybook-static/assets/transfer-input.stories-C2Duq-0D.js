import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,rt as i,s as a,t as o}from"./iframe-DekVl-_p.js";import{t as s}from"./atoms-DPNcwsZr.js";import{a as c,o as l,t as u}from"./sub-header-nxmxIm98.js";import{d,h as f,r as p}from"./approve-ledger-loading-BquluU52.js";import{n as m,t as h}from"./address-input-CnCf3KkR.js";import{n as g,t as _}from"./memo-input-D-pcfQM9.js";import{n as v,t as y}from"./balance-input-IzRmKeia.js";var b,x=e((()=>{a(),t(),b=r.div`
  ${n.flex({align:`normal`,justify:`normal`})};
  position: relative;
  width: 100%;
  width: 100%;
  height: auto;
  padding: 24px 20px 96px;

  .logo-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 5px;
    margin: 30px 0;
    .logo {
      width: 100px;
      height: 100px;
    }
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
`})),S,C,w=e((()=>{l(),d(),s(),p(),i(),m(),v(),g(),x(),S=o(),C=({tokenMetainfo:e,addressInput:t,balanceInput:n,memoInput:r,hasBackButton:i,isNext:a,onClickBack:o,onClickCancel:s,onClickNext:l})=>(0,S.jsxs)(b,{children:[i?(0,S.jsx)(u,{title:`Send ${e?.symbol||``}`,leftElement:{element:(0,S.jsx)(`img`,{src:`${c}`,alt:`back image`}),onClick:o}}):(0,S.jsx)(u,{title:`Send ${e?.symbol||``}`}),(0,S.jsx)(`div`,{className:`logo-wrapper`,children:(0,S.jsx)(`img`,{className:`logo`,src:e?.image||`data:image/svg+xml,%3csvg%20width='34'%20height='34'%20viewBox='0%200%2034%2034'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cellipse%20cx='17'%20cy='17'%20rx='17'%20ry='17'%20fill='%23596782'/%3e%3cpath%20d='M15.2515%2020.7951V20.626C15.2632%2019.5219%2015.3719%2018.6435%2015.5774%2017.9905C15.7888%2017.3376%2016.0883%2016.8093%2016.4759%2016.4057C16.8635%2016.0021%2017.3303%2015.6341%2017.8765%2015.3017C18.2288%2015.0761%2018.5459%2014.8239%2018.8278%2014.5449C19.1097%2014.2659%2019.3328%2013.9454%2019.4973%2013.5833C19.6617%2013.2212%2019.7439%2012.8206%2019.7439%2012.3813C19.7439%2011.8531%2019.6206%2011.396%2019.374%2011.0102C19.1273%2010.6244%2018.7985%2010.3276%2018.3874%2010.1199C17.9822%209.90618%2017.53%209.79934%2017.0308%209.79934C16.5787%209.79934%2016.147%209.89431%2015.736%2010.0843C15.3249%2010.2742%2014.9843%2010.571%2014.7142%2010.9746C14.444%2011.3723%2014.2884%2011.8857%2014.2473%2012.5149H11.5695C11.6106%2011.4465%2011.8778%2010.5443%2012.371%209.80824C12.8643%209.06629%2013.5162%208.50537%2014.3266%208.12549C15.1428%207.7456%2016.0443%207.55566%2017.0308%207.55566C18.1114%207.55566%2019.0568%207.76044%2019.8672%208.17C20.6776%208.57363%2021.306%209.14048%2021.7523%209.87057C22.2045%2010.5947%2022.4306%2011.4405%2022.4306%2012.4081C22.4306%2013.0729%2022.3278%2013.6724%2022.1223%2014.2066C21.9167%2014.7348%2021.6231%2015.2067%2021.2414%2015.6222C20.8656%2016.0377%2020.4134%2016.4057%2019.8849%2016.7262C19.3857%2017.0408%2018.9805%2017.3673%2018.6693%2017.7056C18.3639%2018.044%2018.1407%2018.4446%2017.9998%2018.9076C17.8589%2019.3706%2017.7825%2019.9434%2017.7708%2020.626V20.7951H15.2515ZM16.5816%2026.2084C16.1001%2026.2084%2015.6861%2026.0363%2015.3396%2025.692C14.9931%2025.3418%2014.8199%2024.9204%2014.8199%2024.4277C14.8199%2023.941%2014.9931%2023.5255%2015.3396%2023.1813C15.6861%2022.8311%2016.1001%2022.656%2016.5816%2022.656C17.0573%2022.656%2017.4683%2022.8311%2017.8148%2023.1813C18.1672%2023.5255%2018.3433%2023.941%2018.3433%2024.4277C18.3433%2024.7542%2018.2611%2025.054%2018.0967%2025.327C17.9381%2025.5941%2017.7267%2025.8078%2017.4625%2025.9681C17.1982%2026.1283%2016.9046%2026.2084%2016.5816%2026.2084Z'%20fill='%2390A2C0'/%3e%3c/svg%3e`,alt:`token image`})}),(0,S.jsx)(`div`,{className:`address-input-wrapper`,children:(0,S.jsx)(h,{...t})}),(0,S.jsx)(`div`,{className:`balance-input-wrapper`,children:(0,S.jsx)(y,{...n})}),(0,S.jsx)(`div`,{className:`memo-input-wrapper`,children:(0,S.jsx)(_,{...r})}),(0,S.jsx)(f,{leftButton:{text:`Cancel`,onClick:s},rightButton:{text:`Next`,onClick:l,disabled:!a,primary:!0},filled:!0})]}),C.__docgenInfo={description:``,methods:[],displayName:`TransferInput`,props:{tokenMetainfo:{required:!1,tsType:{name:`TokenModel`},description:``},addressInput:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
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
}[]`,required:!0}},{key:`onClickInputIcon`,value:{name:`signature`,type:`function`,raw:`(selected: boolean) => void`,signature:{arguments:[{type:{name:`boolean`},name:`selected`}],return:{name:`void`}},required:!0}},{key:`onChangeAddress`,value:{name:`signature`,type:`function`,raw:`(address: string) => void`,signature:{arguments:[{type:{name:`string`},name:`address`}],return:{name:`void`}},required:!0}},{key:`onClickAddressBook`,value:{name:`signature`,type:`function`,raw:`(addressBookId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`addressBookId`}],return:{name:`void`}},required:!0}}]}},description:``},balanceInput:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  hasError: boolean
  amount: string
  denom: string
  description: string
  onChangeAmount: (value: string) => void
  onClickMax: () => void
}`,signature:{properties:[{key:`hasError`,value:{name:`boolean`,required:!0}},{key:`amount`,value:{name:`string`,required:!0}},{key:`denom`,value:{name:`string`,required:!0}},{key:`description`,value:{name:`string`,required:!0}},{key:`onChangeAmount`,value:{name:`signature`,type:`function`,raw:`(value: string) => void`,signature:{arguments:[{type:{name:`string`},name:`value`}],return:{name:`void`}},required:!0}},{key:`onClickMax`,value:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}},required:!0}}]}},description:``},memoInput:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  memo: string
  memoError?: BaseError | null
  onChangeMemo: (memo: string) => void
}`,signature:{properties:[{key:`memo`,value:{name:`string`,required:!0}},{key:`memoError`,value:{name:`union`,raw:`BaseError | null`,elements:[{name:`BaseError`},{name:`null`}],required:!1}},{key:`onChangeMemo`,value:{name:`signature`,type:`function`,raw:`(memo: string) => void`,signature:{arguments:[{type:{name:`string`},name:`memo`}],return:{name:`void`}},required:!0}}]}},description:``},isNext:{required:!0,tsType:{name:`boolean`},description:``},hasBackButton:{required:!0,tsType:{name:`boolean`},description:``},onClickBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickNext:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),T,E,D,O;e((()=>{w(),{action:T}=__STORYBOOK_MODULE_ACTIONS__,E={title:`components/transfer/TransferInput`,component:C},D={args:{tokenMetainfo:{main:!0,display:!1,tokenId:`tokenId`,networkId:`DEFAULT`,name:`Gno.land`,image:``,symbol:`GNOT`,type:`gno-native`,decimals:6},balanceInput:{hasError:!1,amount:`132123123123`,denom:`GNOT`,description:`Balance: 342,234.0003 GNOT`,onChangeAmount:T(`change amount`),onClickMax:T(`click max button`)},addressInput:{opened:!1,hasError:!1,errorMessage:`Invalid address`,selected:!1,selectedName:``,selectedDescription:`(g1ff...jpae)`,address:``,addressBookInfos:[],onClickInputIcon:T(`click input icon`),onChangeAddress:T(`change address`),onClickAddressBook:T(`click address book`)},memoInput:{memo:``,onChangeMemo:T(`onChangeMemo`)},isNext:!0,hasBackButton:!0,onClickBack:T(`click back`),onClickCancel:T(`click cancel`),onClickNext:T(`click next`)}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    tokenMetainfo: {
      main: true,
      display: false,
      tokenId: 'tokenId',
      networkId: 'DEFAULT',
      name: 'Gno.land',
      image: '',
      symbol: 'GNOT',
      type: 'gno-native',
      decimals: 6
    },
    balanceInput: {
      hasError: false,
      amount: '132123123123',
      denom: 'GNOT',
      description: 'Balance: 342,234.0003 GNOT',
      onChangeAmount: action('change amount'),
      onClickMax: action('click max button')
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
}`,...D.parameters?.docs?.source}}},O=[`Default`]}))();export{D as Default,O as __namedExportsOrder,E as default};