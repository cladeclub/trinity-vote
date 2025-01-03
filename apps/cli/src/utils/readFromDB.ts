import { EntryStream } from 'level-read-stream';

import db from './db.js';

const readFromDB = (
  electionId: string,
  callback: (
    err: Error | string | null,
    data: { nullifier: string, vote_proof: object }[]
  ) => void
) => {
  const electionSublevel = db.sublevel(electionId, { valueEncoding: 'json' });

  const votes: { nullifier: string, vote_proof: object }[] = [];

  (new EntryStream(electionSublevel))
    .on('data', entry => {
      votes.push({ nullifier: entry.key, vote_proof: entry.value });
    })
    .on('error', err => {
      return callback(err, []);
    })
    .on('end', () => {
      return callback(null, votes);
    });
};
