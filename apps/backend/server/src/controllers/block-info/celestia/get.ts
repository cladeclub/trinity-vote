import { Request, Response } from 'express';

interface BlockInfo {
  block_height: number;
  block_hash: string;
};

const CELESTIA_MAINNET_RPC = 'https://rpc-mocha.pops.one/block';
const BLOCK_INFO_CACHE_TIME = 5 * 60 * 1000;

let lastResponse: BlockInfo;
let lastRequestTime: number;

export default async (
  req: Request,
  res: Response
) => {
  try {
    if (lastResponse && Date.now() - lastRequestTime < BLOCK_INFO_CACHE_TIME) {
      res.json({
        success: true,
        ...lastResponse,
      });
      return;
    }

    const response = await fetch(CELESTIA_MAINNET_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'block',
        params: [],
        id : 1
      })
    });
    const result = await response.json();

    const blockHeight = result?.result?.block?.header?.height;
    const blockHash = result?.result?.block_id?.hash;

    if (!blockHeight || !blockHash) {
      res.json({
        success: false,
        error: 'block_info_not_found',
      });
      return;
    }

    lastResponse = {
      block_height: blockHeight,
      block_hash: blockHash,
    };
    lastRequestTime = Date.now();

    res.json({
      success: true,
      ...lastResponse,
    });
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message,
    });
  };
};