import * as Comlink from "comlink";

export default class ZkappWorkerClient {
  worker: Worker;
  remoteApi: Comlink.Remote<typeof import("./zkappWorker.js").api>;

  constructor() {
    const worker = new Worker(new URL("./zkappWorker.ts", import.meta.url), {
      type: "module",
    });
    this.remoteApi = Comlink.wrap(worker);
  }

  setActiveInstanceToDevnet() {
    return this.remoteApi.setActiveInstanceToDevnet();
  }

  async loadProgram() {
    return this.remoteApi.loadProgram();
  }

  async compileProgram() {
    return this.remoteApi.compileProgram();
  }

  async createVote(data: any) {
    const result = await this.remoteApi.createVote(data);

    return result;
  }

  async deployElection(
    electionDeployer: string,
    electionStartBlock: number,
    electionFinalizeBlelectionStartBlock: number,
    votersRoot: bigint,
    electionData: {
      first: bigint;
      last: bigint;
    },
    settlementReward: number
  ) {
    const result = await this.remoteApi.deployElection(
      electionDeployer,
      electionStartBlock,
      electionFinalizeBlelectionStartBlock,
      votersRoot,
      electionData,
      settlementReward
    );

    return result;
  }

  async loadAndCompileContracts(
    electionStartBlock: number,
    electionFinalizeBlock: number,
    votersRoot: bigint
  ) {
    return this.remoteApi.loadAndCompileContracts(
      electionStartBlock,
      electionFinalizeBlock,
      votersRoot
    );
  }
}
