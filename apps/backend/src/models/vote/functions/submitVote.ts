import { JsonProof } from 'o1js';

import { types } from 'zkvot-core';

import writeToAvail from '../../../utils/da-layers/avail/write.js';
import writeToCelestia from '../../../utils/da-layers/celestia/write.js';

export default (
  data: {
    submission_data: types.DaLayerSubmissionData;
    da_layer: 'avail' | 'celestia';
    namespace?: string;
    app_id?: number;
  },
  callback: (error: string | null, result?: { blockHeight: number, txHash: string }) => any
) => {
  if (data.da_layer !== 'avail')
    return callback(null);

  if (data.da_layer == 'avail') {
    if (!data.app_id)
      return callback('bad_request');

    writeToAvail(data.app_id, data.submission_data, (err, availResult) => {
      if (err)
        return callback(err);
      if (!availResult)
        return callback('bad_request');

      return callback(null, availResult);
    });
  } else if (data.da_layer == 'celestia') {
    if (!data.namespace)
      return callback('bad_request');

    writeToCelestia(data.namespace, data.submission_data, (err, celestiaResult) => {
      if (err)
        return callback(err);
      if (!celestiaResult)
        return callback('bad_request');

      return callback(null, {
        txHash: '',
        ...celestiaResult
      });
    });
  } else {
    return callback('impossible_error')
  };
};
