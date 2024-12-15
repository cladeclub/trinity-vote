import decodeFromBase64String from '../../decodeFromBase64String.js';

import { mainnet, testnet } from './config.js';

export default (
  height: number,
  namespace: string,
  is_devnet: boolean,
  callback: (
    error: string | null,
    submission_data_list?: { namespace: string; data: string; }[]
  ) => any
) => {
  let submission_data_list: { namespace: string; data: string; }[] = [];

  const celestiaNetwork = is_devnet ? testnet : mainnet;

  if (!celestiaNetwork.localEndpoint || !celestiaNetwork.authToken)
    return callback('not_authenticated_request');

  fetch(celestiaNetwork.localEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${celestiaNetwork.authToken}`
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'blob.GetAll',
      params: [
        height,
        [ namespace ]
      ]
    })
  })
  .then(res => res.json())
  .then(jsonRes => {
    if (!jsonRes.result)
      return callback('not_found');

    for (let i = 0; i < jsonRes.result.length; i++) {
      const dataSubmission = jsonRes.result[i];

      decodeFromBase64String(dataSubmission.data, (err, decodedData) => {
        if (err)
          return callback(err);

        submission_data_list.push({ namespace: dataSubmission.namespace, data: decodedData });
      });
    };

    return callback(null, submission_data_list);
  })
  .catch(_ => callback('read_error'));
};
