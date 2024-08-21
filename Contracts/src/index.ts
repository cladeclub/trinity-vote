import {
  Field,
  Mina,
  MerkleTree,
  PrivateKey,
  PublicKey,
  Poseidon,
  verify,
  Experimental,
} from 'o1js';

import { MerkleWitnessClass } from './utils.js';

import { Vote, VotePrivateInputs, VotePublicInputs } from './NewVote.js';
import {
  VoteAggregator,
  VoteAggregatorPublicInputs,
} from './VoteAggregator.js';

let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);
// setNumberOfWorkers(8);

let votersArray: Array<[privateKey: PrivateKey, publicKey: PublicKey]> = [];

for (let i = 0; i < 10; i++) {
  let privateKey = PrivateKey.random();
  let publicKey = privateKey.toPublicKey();
  votersArray.push([privateKey, publicKey]);
  // console.log(`Voter ${i} private key: ${privateKey.toBase58()}`);
  // console.log(`Voter ${i} public key: ${publicKey.toBase58()}`);
}

votersArray.sort((a) => {
  if (a[1] < a[1]) {
    return -1;
  }
  if (a[1] > a[1]) {
    return 1;
  }
  return 0;
});

// console.log('Sorted public keys:');

for (let i = 0; i < 10; i++) {
  // console.log(`Voter ${i} public key: ${votersArray[i][1].toBase58()}`);
}

let votersTree = new MerkleTree(32);

for (let i = 0; i < 10; i++) {
  let leaf = Poseidon.hash(votersArray[i][1].toFields());
  votersTree.setLeaf(BigInt(i), leaf);
}

let votersRoot = votersTree.getRoot();
console.log(`Voters root: ${votersRoot.toString()}`);

console.log('compiling vote program');
let { verificationKey } = await Vote.compile();
console.log('verification key', verificationKey.data.slice(0, 10) + '..');

console.log('casting votes');
let voteProofs = [];

let votingId = Field.from(123);

for (let i = 0; i < 10; i++) {
  let vote = BigInt((i % 2) + 1);
  let privateKey = votersArray[i][0];
  let merkleTreeWitness = votersTree.getWitness(BigInt(i));
  let witness = new MerkleWitnessClass(merkleTreeWitness);

  let votePublicInputs = new VotePublicInputs({
    votingId: votingId,
    vote: Field.from(vote),
    votersRoot: votersRoot,
  });
  let votePrivateInputs = new VotePrivateInputs({
    privateKey: privateKey,
    votersMerkleWitness: witness,
  });

  let time = Date.now();
  let voteProof = await Vote.vote(votePublicInputs, votePrivateInputs);
  // console.log(`Vote ${i} proof: ${JSON.stringify(voteProof.toJSON())}`);
  // console.log(
  //   `vote casted by voter ${i} with vote ${voteProof.publicOutput.vote.toString()}`
  // );
  console.log(`vote ${i} proof took ${(Date.now() - time) / 1000} seconds `);
  voteProofs.push(voteProof);
}

// console.log('vote aggregator digest', await VoteAggregator.digest());

console.log('compiling vote aggregator program');

let { verificationKey: voteAggregatorVerificationKey } =
  await VoteAggregator.compile();
console.log(
  'verification key',
  voteAggregatorVerificationKey.data.slice(0, 10) + '..'
);

console.log('base proof');
class MerkleMap extends Experimental.IndexedMerkleMap(30) {}

let countedVotersMap = new MerkleMap();
// console.log(countedVotersMap);
// console.log(countedVotersMap.root);

// let countedVotersMapWitness = countedVotersMap.getWitness(Field.from(0));
let baseProof = await VoteAggregator.base({
  votersRoot: votersRoot,
  votedMapRoot: countedVotersMap.root,
  voteId: votingId,
});
console.log('aggregating votes');

let previousProof = baseProof;

for (let i = 0; i < 10; i++) {
  let voteProof = voteProofs[i];
  let voteId = votingId;
  // console.log(countedVotersMap);
  // console.log(countedVotersMap.root);

  let publicInput = new VoteAggregatorPublicInputs({
    votersRoot: votersRoot,
    votedMapRoot: countedVotersMap.root,
    voteId: voteId,
  });

  let time = Date.now();
  // console.log(1);
  let proof = await VoteAggregator.aggregateVotes(
    publicInput,
    previousProof,
    voteProof,
    countedVotersMap.clone()
  );
  console.log(`Vote ${i} proof took ${(Date.now() - time) / 1000} seconds `);
  // console.log(
  //   `After vote ${i} yays: ${proof.publicOutput.yeys.toString()}, nays: ${proof.publicOutput.nays.toString()}`
  // );
  let ok = await verify(proof, voteAggregatorVerificationKey);
  console.log(`Vote ${i} proof verified: ${ok}`);
  if (!ok) {
    throw new Error(`Vote ${i} proof failed to verify`);
  }
  // console.log(
  //   `Vote ${i} total aggregated count: ${proof.publicOutput.totalAggregatedCount.toString()}`
  // );
  previousProof = proof;
  countedVotersMap.root = countedVotersMap.root;
  // console.log('val', voteProof.publicOutput.nullifier.value);
  // console.log(countedVotersMap.length);
  // console.log('oldroot', countedVotersMap.root);
  // console.log('new root', proof.publicOutput.newVotedTreeRoot);
  countedVotersMap.insert(
    voteProof.publicOutput.nullifier,
    voteProof.publicOutput.vote
  );
  countedVotersMap.root = countedVotersMap.root;
  // console.log(countedVotersMap);
  // console.log(countedVotersMap.root);
}

console.log('done');
console.log('yeys:', previousProof.publicOutput.yeys.toString());
console.log('nays:', previousProof.publicOutput.nays.toString());
