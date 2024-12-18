import * as Comlink from 'comlink';

import { Election, AggregationMM as Aggregation } from 'zkvot-core';

import { Nullifier } from '@aurowallet/mina-provider';
import { Field, JsonProof } from 'o1js';

export default class {
  worker: Worker;
  remoteApi: Comlink.Remote<typeof import('@/utils/ZKProgramWorker.js').api>;
  constructor() {
    const worker = new Worker(
      new URL('@/utils/ZKProgramWorker.js', import.meta.url),
      {
        type: 'module',
      }
    );
    this.remoteApi = Comlink.wrap(worker);
  };
  async setActiveInstance({ devnet }: { devnet?: boolean }) {
    return this.remoteApi.setActiveInstance({ devnet });
  };
  async loadAndCompileVoteProgram() {
    return this.remoteApi.loadAndCompileVoteProgram();
  };
  async loadAndCompileAggregationProgram() {
    return this.remoteApi.loadAndCompileAggregationProgram();
  };
  async createVote(data: {
    electionPubKey: string;
    nullifier: Nullifier;
    vote: number;
    votersArray: string[];
    publicKey: string;
  }) {
    return this.remoteApi.createVote(data);
  };
  async deployElection(
    electionDeployer: string,
    electionStartBlock: number,
    electionFinalizeBlock: number,
    votersRoot: bigint,
    electionStorageInfo: Election.StorageLayerInfoEncoding,
    electionDataCommitment: Field,
    settlementReward?: number
  ) {
    return this.remoteApi.deployElection(
      electionDeployer,
      electionStartBlock,
      electionFinalizeBlock,
      votersRoot,
      {
        first: electionStorageInfo.first.toBigInt(),
        last: electionStorageInfo.last.toBigInt(),
      },
      electionDataCommitment.toBigInt(),
      settlementReward || 0
    );
  };
  async submitElectionResult(
    electionPubKey: string,
    electionConstants: {
      electionStartBlock: number;
      electionFinalizeBlock: number;
      votersRoot: bigint;
    },
    aggregateProofJson: JsonProof,
    lastAggregatorPubKey: string,
    settlerPubKey: string,
  ) {
    return this.remoteApi.submitElectionResult(
      electionPubKey,
      electionConstants,
        aggregateProofJson,
      lastAggregatorPubKey,
      settlerPubKey
    );
  };
  async loadAndCompileElectionContract(
    electionStartBlock: number,
    electionFinalizeBlock: number,
    votersRoot: bigint
  ) {
    return this.remoteApi.loadAndCompileElectionContract(
      electionStartBlock,
      electionFinalizeBlock,
      votersRoot
    );
  };
  getVerificationKey() {
    return this.remoteApi.getVerificationKey();
  }
};
