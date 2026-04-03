import{m as t,j as e}from"./global-style-Be4sOX77.js";import{T as g}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{g as u}from"./index-Dfwxv35r.js";import{A as x}from"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{f as r,g as i,d as h,r as f}from"./theme-D2qI5cuM.js";import{c as w}from"./check-circle-CjD84sGI.js";const v="data:image/svg+xml,%3csvg%20width='80'%20height='80'%20viewBox='0%200%2080%2080'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3crect%20width='80'%20height='80'%20rx='12'%20fill='%23191920'/%3e%3cg%20clipPath='url(%23clip0_4258_79017)'%3e%3cpath%20d='M65%2019H15C14.4477%2019%2014%2019.4477%2014%2020V59C14%2059.5523%2014.4477%2060%2015%2060H65C65.5523%2060%2066%2059.5523%2066%2059V20C66%2019.4477%2065.5523%2019%2065%2019Z'%20fill='%23E7E8F3'/%3e%3cpath%20d='M60.1022%2053.4891C60.4983%2054.1557%2060.0179%2055%2059.2425%2055H20.6114C19.8696%2055%2019.386%2054.2208%2019.7153%2053.5561L31.1912%2030.3903C31.5139%2029.739%2032.4018%2029.6386%2032.8617%2030.2015L45.7084%2045.9248C46.0941%2046.3969%2046.809%2046.4169%2047.2206%2045.9671L51.4107%2041.3871C51.8635%2040.8922%2052.6655%2040.9747%2053.0082%2041.5513L60.1022%2053.4891Z'%20fill='%23191920'/%3e%3cpath%20d='M47%2037C49.2091%2037%2051%2035.2091%2051%2033C51%2030.7909%2049.2091%2029%2047%2029C44.7909%2029%2043%2030.7909%2043%2033C43%2035.2091%2044.7909%2037%2047%2037Z'%20fill='%23191920'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_4258_79017'%3e%3crect%20width='52'%20height='41'%20fill='white'%20transform='translate(14%2019)'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e",y=h.div`
  ${t.flex({justify:"flex-start"})};
  width: 100%;
  padding: 0 20px;
  align-self: center;

  .main-title {
    max-width: 320px;
    text-overflow: ellipsis;
    margin-top: 24px;
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    text-align: center;
  }

  .logo-wrapper {
    margin: 24px auto;
    width: 100%;
    height: auto;
    text-align: center;

    img {
      width: 80px;
      height: 80px;
    }
  }

  .domain-wrapper {
    ${t.flex({direction:"row"})};
    width: 100%;
    min-height: 41px;
    border-radius: 24px;
    padding: 10px 18px;
    margin-bottom: 12px;
    background-color: ${i("neutral","_9")};
    ${r.body2Reg};
  }

  .info-table {
    width: 100%;
    height: auto;
    border-radius: 18px;
    background-color: ${i("neutral","_9")};

    .info-table-header {
      ${t.flex({align:"flex-start"})};
      width: 100%;
      padding: 12px;
      color: ${i("neutral","a")};
      ${r.body2Bold};
      border-bottom: 2px solid ${i("neutral","_8")};
    }

    .info-table-body {
      ${t.flex({align:"flex-start"})};
      width: 100%;
      padding: 12px;
      gap: 8px;
      ${r.body2Reg};

      .row {
        position: relative;
        padding-left: 24px;
        :before {
          content: '';
          width: 16px;
          height: 16px;
          background-image: url(${w});
          ${t.posTopCenterLeft()}
        }
      }
    }
  }

  .description-wrapper {
    ${t.flex({align:"flex-start"})};
    padding: 4px 0;
    margin-bottom: 43px;
    color: ${i("neutral","a")};
    ${r.captionReg};
  }
`,C=({loading:a,app:s,logo:p,domain:d,processing:l,done:o,onClickConnect:c,onClickCancel:m,onResponse:n})=>a?e.jsx(x,{rightButtonText:"Connect"}):(f.useEffect(()=>{o&&n()},[o,n]),e.jsxs(y,{children:[e.jsx(g,{className:"main-title",type:"header4",children:`Connect to ${s}`}),e.jsx("div",{className:"logo-wrapper",children:e.jsx("img",{src:p||v,alt:"logo img"})}),e.jsx("div",{className:"domain-wrapper",children:e.jsx("span",{children:d})}),e.jsxs("div",{className:"info-table",children:[e.jsx("div",{className:"info-table-header",children:e.jsx("span",{children:"Allow this site to:"})}),e.jsxs("div",{className:"info-table-body",children:[e.jsx("div",{className:"row",children:e.jsx("span",{children:"See your address, balance and activity "})}),e.jsx("div",{className:"row",children:e.jsx("span",{children:"Suggest transactions to approve"})})]})]}),e.jsx("div",{className:"description-wrapper",children:e.jsx("span",{children:"Only connect to websites you trust."})}),e.jsx(u,{filled:!0,leftButton:{text:"Cancel",onClick:m},rightButton:{primary:!0,loading:l,text:"Connect",onClick:c}})]}));C.__docgenInfo={description:"",methods:[],displayName:"WalletConnect",props:{loading:{required:!0,tsType:{name:"boolean"},description:""},app:{required:!0,tsType:{name:"string"},description:""},logo:{required:!0,tsType:{name:"string"},description:""},domain:{required:!0,tsType:{name:"string"},description:""},processing:{required:!0,tsType:{name:"boolean"},description:""},done:{required:!0,tsType:{name:"boolean"},description:""},onClickConnect:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onResponse:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onTimeout:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{v as D,C as W};
