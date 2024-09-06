import { createGlobalStyle } from 'styled-components';
import { fonts } from './theme';
import mixins from './mixins';

export const GlobalWebStyle = createGlobalStyle`
  * {
    font-family: Inter, sans-serif;
    box-sizing: border-box;
  }

  html,
  body,
  #web {
    height: 100%;
  }

  html {
    background: black;
  }
  body {
    margin: 0;
    background: radial-gradient(100% 100% at 50% 0%, rgba(16, 18, 20, 0.00) 48.83%, rgba(0, 89, 255, 0.24) 100%);
    overflow: auto;
  }
`;

export const GlobalPopupStyle = createGlobalStyle`
  html, body {
    width: 100%;
    height: 100%;
    min-width: 360px;
    min-height: 566px;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    font-family: "Poppins", sans-serif;
    color: #ffffff;
    position: relative;
    background-color: #212128;
    overflow-y: auto;
    scroll-behavior: auto;
  };

  #popup {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    position: relative;
    width: 100%;
    height: 100%;
  };

  main {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 360px;
    min-height: 566px;
    min-height: 492px;
    height: 100%;
    padding: 0px 20px 24px;
  };

  * {
    box-sizing: border-box;
    font: inherit;
    color: inherit;
  };

  a {
    text-decoration: none;
  };

  button {
    background: none;
    padding: 0;
    border: none;
    cursor: pointer;
    outline: none;
    &:disabled {
      cursor: default;
    };
  };

  input, textarea {
    background: none; border: none; outline: none;
    &[type="password"]{
      letter-spacing: 7px;
      ::placeholder {
        letter-spacing: normal;
      }
    };
  };

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  };

  ::-webkit-scrollbar {
    width: 0;
  };

  ::-webkit-scrollbar-track {
    background-color: transparent;
  };

  ::-webkit-scrollbar-thumb {
    /* background-color: rgba(255, 255, 255, 0.7);
    border-radius: 10px; */
  };

  html, body, div, span, h1, h2, h3, h4, h5, h6, p, a, em, img, small, b, u, i, ul, li, dl, dd, dt, form, label, footer, header, nav, section, input, textarea {
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    list-style: none;
  };

  h1 {
    ${fonts.header1}
  }

  h2 {
    ${fonts.header2}
  }

  h3 {
    ${fonts.header3}
  }

  h4 {
    ${fonts.header4}
  }

  h5 {
    ${fonts.header5}
  }

  h6 {
    ${fonts.header6}
  }

  h7 {
    ${fonts.header7}
  }

`;
