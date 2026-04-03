import{m as a,j as e}from"./global-style-Be4sOX77.js";import{S as u}from"./side-menu-account-item-B88HI9Jt.js";import{d as p}from"./theme-D2qI5cuM.js";const l=p.div`
  ${a.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
`,x=({currentAccountId:i,accounts:o,focusedAccountId:n,changeAccount:s,moveGnoscan:r,focusAccountId:d,moveAccountDetail:m})=>e.jsx(l,{children:o.map((t,c)=>e.jsx(u,{selected:t.accountId===i,account:t,focusedAccountId:n,changeAccount:s,focusAccountId:d,moveGnoscan:r,moveAccountDetail:m},c))});x.__docgenInfo={description:"",methods:[],displayName:"SideMenuAccountList"};export{x as S};
