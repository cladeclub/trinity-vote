import { Request, Response } from 'express';

import { types } from 'zkvot-core';

import Election from '../../../models/election/Election.js';

export default (
  req: Request,
  res: Response
) => {
  if (!req.body || !req.body.mina_contract_id || typeof req.body.mina_contract_id !== 'string') {
    res.json({ success: false, error: 'bad_request' });
    return;
  }

  Election.findOrCreateElectionByContractId(req.body, (err: string | null, election?: types.ElectionBackendData) => {
    if (err)
      return res.json({ success: false, error: err });

    return res.json({ success: true, election });
  });
};
