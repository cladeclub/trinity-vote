import {
  AccountUpdate,
  Field,
  Mina,
  PublicKey,
  PrivateKey,
  Nullifier,
  VerificationKey,
  fetchAccount,
} from 'o1js';
import * as Comlink from 'comlink';

import { AggregationMM as Aggregation, MerkleTree, Vote } from 'zkvot-core';

import { Nullifier as NullifierType } from '@aurowallet/mina-provider';

import encodeDataToBase64String from '@/utils/encodeDataToBase64String.js';

const state: {
  VoteProgram: typeof Vote.Program | null;
  voteProgramVerificationKey: VerificationKey;
  isVoteProgramCompiled: boolean;
  isVoteProgramCompiling: boolean;

  AggregationProgram: typeof Aggregation.Program | null;
  aggregationProgramVerificationKey: VerificationKey;
  isAggregationProgramCompiled: boolean;
  isAggregationProgramCompiling: boolean;
} = {
  VoteProgram: null,
  voteProgramVerificationKey: Vote.verificationKey,
  isVoteProgramCompiled: false,
  isVoteProgramCompiling: false,

  AggregationProgram: null,
  aggregationProgramVerificationKey: Vote.verificationKey,
  isAggregationProgramCompiled: false,
  isAggregationProgramCompiling: false
};

export const api = {
  async setActiveInstance(data: {
    devnet?: boolean
  }) {
    const Network = Mina.Network({
      mina: `https://api.minascan.io/node/${data.devnet ? 'devnet' : 'mainnet'}/v1/graphql`,
      archive: `https://api.minascan.io/archive/${data.devnet ? 'devnet' : 'mainnet'}/v1/graphql`
    });

    Mina.setActiveInstance(Network);
  },
  async loadAndCompileVoteProgram() {
    try {
      if (state.isVoteProgramCompiled)
        return;
      if (state.isVoteProgramCompiling)
        throw new Error('zkVot is loading in the background, please wait a minute');

      const { Vote } = await import('zkvot-core');

      state.VoteProgram = Vote.Program;

      console.log('VoteProgram compile');
      console.time('VoteProgram compile');
      const { verificationKey } = await state.VoteProgram.compile({ proofsEnabled: true });
      console.timeEnd('VoteProgram compile');

      state.voteProgramVerificationKey = verificationKey;
      state.isVoteProgramCompiled = true;

      return verificationKey;
    } catch (err) {
      state.isVoteProgramCompiling = false;
      throw err;
    };
  },
  async loadAndCompileAggregationProgram() {
    try {
      if (!state.isVoteProgramCompiled)
        throw new Error('VoteProgram is not compiled. Call loadAndCompileVoteProgram() first.');
      if (state.isAggregationProgramCompiled)
        return;
      if (state.isAggregationProgramCompiling)
        throw new Error('zkVot is loading in the background, please wait a minute');

      const { AggregationMM: Aggregation } = await import('zkvot-core');

      state.AggregationProgram = Aggregation.Program;

      console.log('AggregationProgram compile');
      console.time('AggregationProgram compile');
      const { verificationKey } = await state.AggregationProgram.compile({ proofsEnabled: true });
      console.timeEnd('AggregationProgram compile');

      state.aggregationProgramVerificationKey = verificationKey;
      state.isAggregationProgramCompiled = true;

      return verificationKey;
    } catch (err) {
      state.isAggregationProgramCompiling = false;
      throw err;
    };
  },
  async loadAndCompileElectionContract(
    electionStartSlot: number,
    electionFinalizeSlot: number,
    votersRoot: bigint
  ) {
    if (!state.isVoteProgramCompiled || !state.isAggregationProgramCompiled)
      throw new Error('VoteProgram and AggregationProgram must be compiled first');

    const { Election } = await import('zkvot-core');

    Election.setContractConstants({
      electionStartSlot,
      electionFinalizeSlot,
      votersRoot,
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
    if (!state.VoteProgram || !state.isVoteProgramCompiled)
      throw new Error('VoteProgram must be compiled first');

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
        encodeDataToBase64String(
          voteProof.proof.toJSON(),
          (err, base64String) => {
            if (err) return reject(err);

            if (!base64String)
              return reject('Error encoding proof to base64 string');

            return resolve(base64String);
          }
        );
      });

      return encodedVoteProof;
    } catch (error) {
      console.error('Error generating zk-proof:', error);
      throw error;
    }
  },
  async deployElection(
    electionDeployer: string,
    electionStartSlot: number,
    electionFinalizeSlot: number,
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
        electionStartSlot,
        electionFinalizeSlot,
        votersRoot
      );
      const ElectionContractInstance = new ElectionContract(
        electionContractPubKey
      );

      const deployTx = await Mina.transaction(
        {
          sender: PublicKey.fromBase58(electionDeployer),
          fee: 1e8,
        },
        async () => {
          AccountUpdate.fundNewAccount(PublicKey.fromBase58(electionDeployer));
          await ElectionContractInstance.deploy();
          await ElectionContractInstance.initialize(
            {
              first: Field(electionStorageInfo.first),
              last: Field(electionStorageInfo.last),
            },
            Field.from(electionDataCommitment)
          );
        }
      );
      deployTx.sign([electionContractPrivKey]);
      const result = await deployTx.prove();

      if (!result) return;

      return {
        mina_contract_id: electionContractPubKey.toBase58(),
        txJSON: deployTx.toJSON(),
      };
    } catch (error) {
      console.log(error);
      console.error('Error deploying election contract:', error);
      throw error;
    }
  },
  async submitElectionResult(
    electionPubKey: string,
    electionConstants: {
      electionStartSlot: number;
      electionFinalizeSlot: number;
      votersRoot: bigint;
    },
    aggregateProofJson: string,
    lastAggregatorPubKey: string,
    settlerPubKey: string
  ) {
    const aggregateProof = await Aggregation.Proof.fromJSON(JSON.parse(aggregateProofJson));

    const ElectionContract = await this.loadAndCompileElectionContract(
      electionConstants.electionStartSlot,
      electionConstants.electionFinalizeSlot,
      electionConstants.votersRoot
    );
    const ElectionContractInstance = new ElectionContract(PublicKey.fromBase58(electionPubKey));

    const settleTx = await Mina.transaction(
      {
        sender: PublicKey.fromBase58(settlerPubKey),
        fee: 1e9,
      },
      async () => {
        await ElectionContractInstance.settleVotes(
          aggregateProof,
          PublicKey.fromBase58(lastAggregatorPubKey)
        );
      }
    );
    const result = await settleTx.prove();

    if (!result) return;

    return settleTx.toJSON();
  },
  getVoteProgramVerificationKey() {
    return state.voteProgramVerificationKey;
  },
  getAggregationProgramVerificationKey() {
    return state.aggregationProgramVerificationKey;
  }
  // async verifyElectionVerificationKeyOnChain(
  //   electionPubKey: string,
  //   electionStartSlot: number,
  //   electionFinalizeSlot: number,
  //   votersRoot: bigint
  // ) {
  //   if (!state.isVoteProgramCompiled || !state.isAggregationProgramCompiled)
  //     throw new Error('AggregationProgram is not compiled. Call loadAndCompileAggregationProgram() first.');

  //   const { Election } = await import('zkvot-core');

  //   Election.setContractConstants({
  //     electionStartSlot,
  //     electionFinalizeSlot,
  //     votersRoot,
  //   });

  //   console.time('ElectionContract compile');
  //   const { verificationKey } = await Election.Contract.compile();
  //   console.timeEnd('ElectionContract compile');

  //   const electionAccount = await fetchAccount({
  //     publicKey: PublicKey.fromBase58(electionPubKey),
  //   });

  //   if (!electionAccount) {
  //     console.error('Election account not found');
  //     return false;
  //   }

  //   const onChainVerificationKey =
  //     electionAccount.account?.zkapp?.verificationKey;

  //   if (!onChainVerificationKey) {
  //     console.error('On-chain verification key not found');
  //     return false;
  //   }

  //   return (
  //     verificationKey.hash.toBigInt() === onChainVerificationKey.hash.toBigInt()
  //   );
  // },
};

Comlink.expose(api);
