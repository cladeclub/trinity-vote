const Celestia = require('../../../../../data-availability/celestia/Celestia');

module.exports = (req, res) => {
  Celestia.createWallet((err, wallet) => {
    if (err)
      return res.json({ err: err });

    return res.json({ data: {
      address: wallet.address,
      mnemonic: wallet.mnemonic
    }})
  });
};