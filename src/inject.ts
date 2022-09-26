const adena = {
  DoContractBak: (message: any) => {
    window.postMessage(
      {
        type: 'TOCS_DoContractPopup',
        data: message.param,
      },
      '*',
    );
  },

  DoContract: function DoContract(message: any) {
    return new Promise((res) => {
      const tmpListener = function (evt: any) {
        console.log('REAL evt.data', evt.data);
        console.log('REAL evt.rtn', evt.rtn);

        if (evt.data === '1001') {
          res({
            status: 'error',
            code: 1001,
            msg: 'No Wallet Found',
          });
        } else if (evt.data === '2000') {
          res({
            status: 'error',
            code: 2000,
            msg: 'Account Mismatch',
          });
        } else if (evt.data === '3000') {
          res({
            status: 'error',
            code: 3000,
            msg: 'Unknown Error',
          });
        } else if (evt.data === '5000') {
          res({
            status: 'info',
            code: 5000,
            msg: 'User rejected transaction execution',
          });
        } else if (evt.data === '6000') {
          res({
            status: 'error',
            code: 6000,
            msg: 'Transaction Failed',
          });
        } else if (evt.data === '7000') {
          res({
            status: 'info',
            code: 7000,
            msg: 'Transaction Succeed',
          });
        }
      };

      window.addEventListener('message', tmpListener, false);

      window.postMessage(
        {
          type: 'TOCS_DoContractPopup',
          data: message.param,
        },
        '*',
      ); // * == target origin

      setInterval(function () {
        window.removeEventListener('message', tmpListener);
      }, 20 * 1000);
    });
  },

  GetAccount: function GetAccount() {
    return new Promise((res) => {
      const tmpListener = function (evt: any) {
        console.log('RECV evt.data', evt.data);
        if (typeof evt.data === 'object') {
          if (evt.data.address) {
            res(evt.data);
          }
        } else if (typeof evt.data === 'string') {
          if (evt.data === '1000') {
            res({
              status: 'error',
              code: 1000,
              msg: 'Adena is Locked',
            });
          } else if (evt.data === '1001') {
            res({
              status: 'error',
              code: 1001,
              msg: 'No Wallet Found',
            });
          } else if (evt.data.includes('4000')) {
            const addr = evt.data.split('_')[1];
            res({
              status: 'error',
              code: 4000,
              msg: 'Account never been used',
              data: addr,
            });
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
