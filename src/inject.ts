const adena = {
  DoContract: (message: any) => {
    window.postMessage(
      {
        type: 'TOCS_DoContractPopup',
        data: message.param,
      },
      '*',
    );
  },

  GetAccount: function GetAccount() {
    return new Promise((res) => {
      const tmpListener = function (evt: any) {
        // console.log("return", evt.data);
        // console.log("return type", typeof evt.data);

        if (typeof evt.data === 'object') {
          if (evt.data.address) {
            res(evt.data);
          }
        } else if (typeof evt.data === 'string') {
          if (evt.data === '1000') {
            res('1000');
          } else {
            res('3000');
          }
        }
      };
      window.addEventListener('message', tmpListener, false);

      window.postMessage(
        {
          type: 'TOCS_GetAccount',
        },
        '*',
      ); // * == target origin

      setInterval(function () {
        window.removeEventListener('message', tmpListener);
      }, 2000);
    });
  },
};

window.adena = adena;
