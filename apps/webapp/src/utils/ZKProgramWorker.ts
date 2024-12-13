import { AccountUpdate, Field, Mina, PublicKey, PrivateKey, Nullifier, verify } from 'o1js';
import * as Comlink from 'comlink';

import { AggregationMM as Aggregation, MerkleTree, Vote} from 'zkvot-core';

import { Nullifier as NullifierType } from '@aurowallet/mina-provider';

import encodeDataToBase64String from '@/utils/encodeDataToBase64String.js';

const state: {
  VoteProgram: typeof Vote.Program | null;
  isVoteProgramCompiled: boolean;
  AggregationProgram: typeof Aggregation.Program | null;
  isAggregationProgramCompiled: boolean;
  verificationKey: string;
} = {
  VoteProgram: null,
  isVoteProgramCompiled: false,
  AggregationProgram: null,
  isAggregationProgramCompiled: false,
  verificationKey: Aggregation.verificationKey
};

export const api = {
  async setActiveInstance(data: { devnet?: boolean }) {
    const Network = Mina.Network({
      mina: `https://api.minascan.io/node/${data.devnet ? 'devnet' : 'mainnet'}/v1/graphql`,
      archive: `https://api.minascan.io/archive/${data.devnet ? 'devnet' : 'mainnet'}/v1/graphql`,
    });

    Mina.setActiveInstance(Network);
  },
  async loadAndCompileVoteProgram() {
    if (state.isVoteProgramCompiled) return;

    const { Vote } = await import('zkvot-core');

    state.VoteProgram = Vote.Program;

    console.log('VoteProgram compile');
    console.time('VoteProgram compile');
    await state.VoteProgram.compile({ proofsEnabled: true });
    console.timeEnd('VoteProgram compile');

    state.isVoteProgramCompiled = true;
  },
  async loadAndCompileAggregationProgram() {
    if (!state.isVoteProgramCompiled)
      throw new Error('VoteProgram not compiled. Call loadAndCompileVoteProgram() first.');

    const { AggregationMM } = await import('zkvot-core');

    state.AggregationProgram = AggregationMM.Program;

    console.log('AggregationProgram compile');
    console.time('AggregationProgram compile');
    const { verificationKey } = await state.AggregationProgram.compile({ proofsEnabled: true });
    console.timeEnd('AggregationProgram compile');

    state.verificationKey = JSON.stringify(verificationKey);

    state.isAggregationProgramCompiled = true;
  },
  async loadAndCompileElectionContract(
    electionStartBlock: number,
    electionFinalizeBlock: number,
    votersRoot: bigint
  ) {
    if (!state.isVoteProgramCompiled || !state.isAggregationProgramCompiled)
      throw new Error('AggregationProgram is not compiled. Call loadAndCompileAggregationProgram() first.');

    const { Election } = await import('zkvot-core');

    Election.setContractConstants({
      electionStartBlock,
      electionFinalizeBlock,
      votersRoot
    });

    console.log('ElectionContract compile');
    console.time('ElectionContract compile');
    await Election.Contract.compile();
    console.timeEnd('ElectionContract compile');

    return Election.Contract;
  },
  async createVote(data: {
    electionPubKey: string;
    nullifier: NullifierType;
    vote: number;
    votersArray: string[];
    publicKey: string;
  }) {
    if (!state.VoteProgram)
      throw new Error('Program not loaded. Call loadProgram() first.');

    const votersTree = MerkleTree.createFromStringArray(data.votersArray);

    if (!votersTree)
      throw new Error('Error creating voters tree from voters array.');

    const voterIndex = MerkleTree.indexOf(data.votersArray, data.publicKey);
    if (voterIndex === -1) {
      throw new Error('Public key not found in voters array.');
    }

    const witness = votersTree.getWitness(BigInt(voterIndex));

    const votePublicInputs = new Vote.PublicInputs({
      electionPubKey: PublicKey.fromBase58(data.electionPubKey),
      vote: Field.from(data.vote),
      votersRoot: votersTree.getRoot(),
    });

    const votePrivateInputs = new Vote.PrivateInputs({
      voterKey: PublicKey.fromJSON(data.publicKey),
      nullifier: Nullifier.fromJSON(data.nullifier),
      votersMerkleWitness: new MerkleTree.Witness(witness),
    });

    try {
      console.time('Generating vote proof');
      const voteProof = await state.VoteProgram.vote(
        votePublicInputs,
        votePrivateInputs
      );
      console.timeEnd('Generating vote proof');

      const encodedVoteProof = await new Promise<string>((resolve, reject) => {
        encodeDataToBase64String(voteProof.proof.toJSON(), (err, base64String) => {
          if (err)
            return reject(err);

          if (!base64String)
            return reject('Error encoding proof to base64 string');

          return resolve(base64String);
        });
      });

      return encodedVoteProof;
    } catch (error) {
      console.error('Error generating zk-proof:', error);
      throw error;
    }
  },
  async deployElection(
    electionDeployer: string,
    electionStartBlock: number,
    electionFinalizeBlock: number,
    votersRoot: bigint,
    electionStorageInfo: {
      first: bigint;
      last: bigint;
    },
    electionDataCommitment: bigint,
    settlementReward?: number
  ) {
    try {
      const electionContractPrivKey = PrivateKey.random();
      const electionContractPubKey = electionContractPrivKey.toPublicKey();

      const ElectionContract = await this.loadAndCompileElectionContract(
        electionStartBlock,
        electionFinalizeBlock,
        votersRoot
      );
      const ElectionContractInstance = new ElectionContract(electionContractPubKey);

      const deployTx = await Mina.transaction(
        {
          sender: PublicKey.fromBase58(electionDeployer),
          fee: 1e8
        },
        async () => {
          AccountUpdate.fundNewAccount(PublicKey.fromBase58(electionDeployer));
          await ElectionContractInstance.deploy();
          await ElectionContractInstance.initialize(
            {
              first: Field(electionStorageInfo.first),
              last: Field(electionStorageInfo.last)
            },
            Field.from(electionDataCommitment)
          );
        }
      );
      deployTx.sign([ electionContractPrivKey ]);
      const result = await deployTx.prove();

      if (!result) return;

      return {
        mina_contract_id: electionContractPubKey.toBase58(),
        txJSON: deployTx.toJSON()
      };
    } catch (error) {
      console.log(error);
      console.error('Error deploying election contract:', error);
      throw error;
    }
  },
  async verifyAggregationProof(
    proofJSON: string,
    electionPubKey: string,
    votersRoot: string,
    result: number[]
  ) {
    try {
      const proof = await Aggregation.Proof.fromJSON(JSON.parse(proofJSON))
        
      if (!proof)
        throw new Error('Error parsing proof');

      if (proof.publicInput.electionPubKey.toBase58() !== electionPubKey)
        throw new Error('Election public key mismatch');
  
      if (proof.publicInput.votersRoot.toBigInt().toString() !== votersRoot)
        throw new Error('Voters root mismatch');

      const proofResults = new Vote.VoteOptions({
        voteOptions_1: proof.publicOutput.voteOptions_1,
        voteOptions_2: proof.publicOutput.voteOptions_2,
        voteOptions_3: proof.publicOutput.voteOptions_3,
      }).toResults();

      if (
        proofResults.length !== result.length ||
        proofResults.find((any, index) => result[index] !== any)
      )
        throw new Error('Proof result mismatch');
  
      if (!(await verify(proof, state.verificationKey)))
        throw new Error('Invalid proof');
  
      return true;
    } catch (error: any) {
      throw new Error(error);
    }
  }
};

Comlink.expose(api);
