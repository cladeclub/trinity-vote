import isPortInUse from "../../utils/isPortInUse.js";

import availRequest from "./functions/availRequest.js";
import installAvail from "./functions/installAvail.js";
import isAvailInstalled from "./functions/isAvailInstalled.js";
import uninstallAvail from "./functions/uninstallAvail.js";

const DEFAULT_RPC_PORT: number = 10103;
const DEFAULT_RPC_URL: string = "http://127.0.0.1:10103";

const Avail = {
  init: (
    data: {
      app_id: number,
      start_block_height: number
    },
    callback: (error: string | null) => void
  ) => {
    isPortInUse(DEFAULT_RPC_PORT, (err, inUse) => {
      if (err)
        return callback(err);

      if (!inUse) {
        installAvail(data, err => {
          if (err)
            return callback(err);

          return callback(null);
        });
      } else {
        isAvailInstalled(DEFAULT_RPC_URL, (err, isInstalled) => {
          if (err)
            return callback(err);

          if (!isInstalled) {
            return callback('port_in_use');
          } else {
            return callback(null);
          };
        });
      };
    });
  },
  getData: (
    data: { block_height: number },
    callback: (error: string | null, blockData?: any) => void
  ) => {
    availRequest(`${DEFAULT_RPC_URL}/v2/blocks/${data.block_height}/data?fields=data`, {
      method: 'GET'
    }, (err, blockData) => {
      if (err)
        return callback(err);

      return callback(null, blockData);
    });
  },
  uninstall: (callback: (error: string | null) => void) => {
    uninstallAvail(err => {
      if (err)
        return callback(err);

      return callback(null);
    });
  }
};

Avail.init({
  app_id: 101,
  start_block_height: 824285
}, err => {
  if (err)
    console.log(err);
  else
    console.log('Avail initialized');
});