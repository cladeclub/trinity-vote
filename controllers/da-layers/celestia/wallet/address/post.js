const Celestia = require('../../../../../da-layers/celestia/Celestia');

module.exports = (req, res) => {
  Celestia.createWallet((err, address) => {
    if (err)
      return res.json({ err: err });

    return res.json({ data: {
      address: address
    }})
  });
};