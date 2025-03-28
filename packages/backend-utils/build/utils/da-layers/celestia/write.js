import encodeDataToBase64String from '../../encodeDataToBase64String.js';
import config from './config.js';
const WALLET_NOT_FUNDED_ERROR_MESSAGE_REGEX = /account (.*?) not found/;
export default (namespace, data, is_devnet, callback) => {
    const celestiaNetwork = is_devnet ? config.testnet : config.mainnet;
    if (!celestiaNetwork.localEndpoint || !celestiaNetwork.authToken)
        return callback('not_authenticated_request');
    encodeDataToBase64String(data, (err, encodedData) => {
        if (err)
            return callback(err);
        if (!encodedData)
            return callback('bad_request');
        fetch(celestiaNetwork.localEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${celestiaNetwork.authToken}`
            },
            body: JSON.stringify({
                id: 1,
                jsonrpc: '2.0',
                method: 'blob.Submit',
                params: [
                    [
                        {
                            namespace: namespace.trim(),
                            data: encodedData.trim()
                        }
                    ],
                    {
                        gas_price: celestiaNetwork.defaultTxFee,
                        is_gas_price_set: true
                    }
                ]
            })
        })
            .then(res => res.json())
            .then(jsonRes => {
            if (WALLET_NOT_FUNDED_ERROR_MESSAGE_REGEX.test(jsonRes.error?.message))
                return callback('wallet_not_funded');
            if (!jsonRes.result)
                return callback(null, {
                    blockHeight: null
                });
            else
                return callback(null, {
                    blockHeight: jsonRes.result
                });
        })
            .catch(_ => callback('write_error'));
    });
};
//# sourceMappingURL=write.js.map