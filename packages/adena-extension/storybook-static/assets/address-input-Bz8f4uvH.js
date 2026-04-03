import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";import{n as d,t as f}from"./address-book-list-DLXK23vt.js";var p,m=e((()=>{p=`data:image/svg+xml,%3csvg%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cline%20x1='0.75'%20y1='-0.75'%20x2='12.4353'%20y2='-0.75'%20transform='matrix(0.703174%200.711018%20-0.703174%200.711018%203%203.6875)'%20stroke='white'%20strokeWidth='1.5'%20strokeLinecap='round'/%3e%3cline%20x1='0.75'%20y1='-0.75'%20x2='12.4353'%20y2='-0.75'%20transform='matrix(-0.703174%200.711018%200.703174%200.711018%2013%203.6875)'%20stroke='white'%20strokeWidth='1.5'%20strokeLinecap='round'/%3e%3c/svg%3e`})),h,g=e((()=>{h=`data:image/svg+xml,%3csvg%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M8.84001%209.07692C10.0771%209.07692%2011.08%208.11259%2011.08%206.92307C11.08%205.73354%2010.0771%204.76923%208.84001%204.76923C7.60291%204.76923%206.60001%205.73354%206.60001%206.92307C6.60001%208.11259%207.60291%209.07692%208.84001%209.07692Z'%20stroke='white'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3cpath%20d='M1.56%206.65384H3.24'%20stroke='white'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3cpath%20d='M1.56%203.96155H3.24'%20stroke='white'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3cpath%20d='M1.56%209.34616H3.24'%20stroke='white'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3cpath%20d='M1.56%2012.0385H3.24'%20stroke='white'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3cpath%20d='M5.4798%2010.6922C5.87107%2010.1907%206.3784%209.78361%206.9616%209.50329C7.54478%209.22291%208.18788%209.07693%208.83989%209.07693C9.4919%209.07693%2010.135%209.22286%2010.7182%209.50318C11.3014%209.7835%2011.8088%2010.1905%2012.2001%2010.6921'%20stroke='white'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3cpath%20d='M14.44%2013.9231V2.07691C14.44%201.77953%2014.1893%201.53845%2013.88%201.53845H3.80001C3.49073%201.53845%203.24001%201.77953%203.24001%202.07691V13.9231C3.24001%2014.2205%203.49073%2014.4615%203.80001%2014.4615H13.88C14.1893%2014.4615%2014.44%2014.2205%2014.44%2013.9231Z'%20stroke='white'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3c/svg%3e`})),_,v=e((()=>{l(),a(),n(),_=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  position: relative;
  width: 100%;

  .input-wrapper {
    ${r.flex({direction:`row`,justify:`normal`})};
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
    ${o.body2Reg};
    background-color: ${s(`neutral`,`_9`)};
    border: 1px solid ${s(`neutral`,`_7`)};
    border-radius: 30px;

    .selected-title-wrapper {
      width: 100%;
      .name {
        font-weight: 600;
      }
      .description {
        margin-left: 5px;
        color: ${s(`neutral`,`a`)};
      }
    }

    .address-input {
      display: flex;
      width: 100%;
      height: auto;
      resize: none;
      overflow: hidden;
      line-height: 25px;

      ::placeholder {
        color: ${s(`neutral`,`a`)};
      }
    }
  }

  .address-book-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    height: 25px;
    padding: 3px 14px;
    margin-left: 5px;
    background-color: ${s(`neutral`,`_7`)};
    border-radius: 15px;
    align-items: center;
    transition: 0.2s;
    cursor: pointer;

    &:hover {
      background-color: ${s(`neutral`,`b`)};
    }

    .address-book {
      width: 100%;
      height: 100%;
    }
  }

  .list-container {
    position: relative;
    width: 100%;
    height: 0;
  }

  .list-wrapper {
    position: absolute;
    width: 100%;
    height: auto;
    max-height: 142px;
    left: 0;
    border: 1px solid ${s(`neutral`,`_7`)};
    border-bottom-right-radius: 25px;
    border-bottom-left-radius: 25px;
    z-index: 4;
    overflow: auto;
  }

  &.opened {
    .input-wrapper {
      border-radius: 25px;
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0;
    }
  }

  &.error {
    .input-wrapper {
      border-color: ${s(`red`,`_5`)};
    }

    .list-wrapper {
      border-color: ${s(`red`,`_5`)};
      border-top-color: ${s(`neutral`,`_7`)};
    }
  }

  .error-message {
    position: relative;
    padding: 0 16px;
    ${o.captionReg};
    font-size: 13px;
    color: ${s(`red`,`_5`)};
  }
`})),y,b,x,S=e((()=>{m(),g(),d(),y=t(c()),v(),b=u(),x=({opened:e,hasError:t,selected:n,selectedName:r,selectedDescription:i,address:a,addressBookInfos:o,errorMessage:s,onClickInputIcon:c,onChangeAddress:l,onClickAddressBook:u})=>{let d=(0,y.useRef)(null);return(0,y.useEffect)(()=>{d.current&&(d.current.style.height=`auto`,d.current.style.height=`${d.current.scrollHeight}px`)},[a]),(0,b.jsxs)(_,{className:`${t?`error`:``} ${e?`opened`:``}`,children:[(0,b.jsxs)(`div`,{className:`input-wrapper`,children:[n?(0,b.jsxs)(`div`,{className:`selected-title-wrapper`,children:[(0,b.jsx)(`span`,{className:`name`,children:r}),(0,b.jsx)(`span`,{className:`description`,children:i})]}):(0,b.jsx)(`textarea`,{ref:d,className:`address-input`,value:a,onChange:e=>l(e.target.value),placeholder:`Recipient’s Gno.land Address`,autoComplete:`off`,maxLength:40,rows:1}),(0,b.jsx)(`div`,{className:`address-book-icon-wrapper`,onClick:()=>c(!n),children:(0,b.jsx)(`img`,{className:`address-book`,src:n?p:h,alt:`search icon`})})]}),(0,b.jsx)(`div`,{className:`list-container`,children:e&&(0,b.jsx)(`div`,{className:`list-wrapper`,children:(0,b.jsx)(f,{addressBookInfos:o,onClickItem:u})})}),t&&(0,b.jsx)(`span`,{className:`error-message`,children:s})]})},x.__docgenInfo={description:``,methods:[],displayName:`AddressInput`,props:{opened:{required:!0,tsType:{name:`boolean`},description:``},hasError:{required:!0,tsType:{name:`boolean`},description:``},selected:{required:!0,tsType:{name:`boolean`},description:``},selectedName:{required:!0,tsType:{name:`string`},description:``},selectedDescription:{required:!0,tsType:{name:`string`},description:``},address:{required:!0,tsType:{name:`string`},description:``},errorMessage:{required:!1,tsType:{name:`string`},description:``},addressBookInfos:{required:!0,tsType:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{
  addressBookId: string
  name: string
  description: string
}`,signature:{properties:[{key:`addressBookId`,value:{name:`string`,required:!0}},{key:`name`,value:{name:`string`,required:!0}},{key:`description`,value:{name:`string`,required:!0}}]}}],raw:`{
  addressBookId: string
  name: string
  description: string
}[]`},description:``},onClickInputIcon:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(selected: boolean) => void`,signature:{arguments:[{type:{name:`boolean`},name:`selected`}],return:{name:`void`}}},description:``},onChangeAddress:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(address: string) => void`,signature:{arguments:[{type:{name:`string`},name:`address`}],return:{name:`void`}}},description:``},onClickAddressBook:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(addressBookId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`addressBookId`}],return:{name:`void`}}},description:``}}}}));export{S as n,x as t};