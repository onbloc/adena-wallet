import{m as n,j as r}from"./global-style-Be4sOX77.js";import{f as t,g as e,d as l}from"./theme-D2qI5cuM.js";const c=l.div`
  ${n.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;

  .input-wrapper {
    ${n.flex({direction:"row",justify:"normal"})};
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
    ${t.body2Reg};
    background-color: ${e("neutral","_9")};
    border: 1px solid ${e("neutral","_7")};
    border-radius: 30px;

    .amount-input {
      width: 100%;
    }

    .denom {
      margin: 0 8px;
    }

    .max-button {
      display: inline-flex;
      flex-shrink: 0;
      width: 64px;
      height: 24px;
      border-radius: 12px;
      background-color: ${e("neutral","_7")};
      align-items: center;
      justify-content: center;
      transition: 0.2s;

      &:hover {
        background-color: ${e("neutral","b")};
      }
    }
  }

  .description {
    position: relative;
    padding: 0 16px;
    ${t.captionReg};
    color: ${e("neutral","a")};
  }

  &.error {
    .input-wrapper {
      border-color: ${e("red","_5")};
    }

    .description {
      color: ${e("red","_5")};
    }
  }
`,m=({hasError:i,amount:a,denom:o,description:s,onChangeAmount:p,onClickMax:u})=>r.jsxs(c,{className:i?"error":"",children:[r.jsxs("div",{className:"input-wrapper",children:[r.jsx("input",{className:"amount-input",type:"number",value:a,autoComplete:"off",onChange:d=>p(d.target.value),placeholder:"Amount"}),r.jsx("span",{className:"denom",children:o}),r.jsx("button",{className:"max-button",onClick:u,children:"Max"})]}),r.jsx("span",{className:"description",children:s})]});m.__docgenInfo={description:"",methods:[],displayName:"BalanceInput",props:{hasError:{required:!0,tsType:{name:"boolean"},description:""},amount:{required:!0,tsType:{name:"string"},description:""},denom:{required:!0,tsType:{name:"string"},description:""},description:{required:!0,tsType:{name:"string"},description:""},onChangeAmount:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onClickMax:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{m as B};
