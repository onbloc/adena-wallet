import{n as e}from"./chunk-zsgVPwQN.js";import{n as t,t as n}from"./address-input-Bz8f4uvH.js";var r,i,a,o,s,c;e((()=>{t(),{action:r}=__STORYBOOK_MODULE_ACTIONS__,i={title:`components/transfer/AddressInput`,component:n},a=[{addressBookId:`1`,description:`(g1uh...ohno)`,name:`Account 1`},{addressBookId:`2`,description:`(g1uh...ohno)`,name:`Account 2`},{addressBookId:`3`,description:`(g1uh...ohno)`,name:`Account 3`},{addressBookId:`4`,description:`(g1uh...ohno)`,name:`Account 4`}],o={args:{opened:!1,hasError:!1,errorMessage:`Invalid address`,selected:!1,selectedName:`Account 1`,selectedDescription:`(g1ff...jpae)`,address:``,addressBookInfos:a,onClickInputIcon:r(`click input icon`),onChangeAddress:r(`change address`),onClickAddressBook:r(`click address book`)}},s={args:{opened:!0,hasError:!1,errorMessage:`Invalid address`,selected:!1,selectedName:void 0,selectedDescription:void 0,address:``,addressBookInfos:[],onClickInputIcon:r(`click input icon`),onChangeAddress:r(`change address`),onClickAddressBook:r(`click address book`)}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    opened: false,
    hasError: false,
    errorMessage: 'Invalid address',
    selected: false,
    selectedName: 'Account 1',
    selectedDescription: '(g1ff...jpae)',
    address: '',
    addressBookInfos,
    onClickInputIcon: action('click input icon'),
    onChangeAddress: action('change address'),
    onClickAddressBook: action('click address book')
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    opened: true,
    hasError: false,
    errorMessage: 'Invalid address',
    selected: false,
    selectedName: undefined,
    selectedDescription: undefined,
    address: '',
    addressBookInfos: [],
    onClickInputIcon: action('click input icon'),
    onChangeAddress: action('change address'),
    onClickAddressBook: action('click address book')
  }
}`,...s.parameters?.docs?.source}}},c=[`Default`,`NoAddress`]}))();export{o as Default,s as NoAddress,c as __namedExportsOrder,i as default};