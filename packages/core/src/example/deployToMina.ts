import {
  AccountUpdate,
  Field,
  Mina,
  Poseidon,
  PrivateKey,
  PublicKey,
} from 'o1js';

import Aggregation from '../Aggregation.js';
import Election from '../Election.js';
import MerkleTree from '../MerkleTree.js';
import Vote from '../Vote.js';

/**
 * @param startBlock start Block of the election
 * @param endBlock end Block of the election
 * @param votersList pubkey list of the voters
 * @param fileCoinDatas filecoin data of the election give 2 fields
 * @param storageLayerCommitment storage layer commitment
 * @param publisherPrivateKey private key of the publisher
 */
export default async function deploy(
  startBlock: number,
  endBlock: number,
  votersList: PublicKey[],
  fileCoinDatas: Field[],
  storageLayerCommitment: Field,
  publisherPrivateKey: PrivateKey
) {
  const Network = Mina.Network({
    mina: 'https://api.minascan.io/node/devnet/v1/graphql',
    archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
  });
  Mina.setActiveInstance(Network);

  votersList = votersList.sort((a, b) => {
    if (
      Poseidon.hash(a.toFields()).toBigInt() <
      Poseidon.hash(b.toFields()).toBigInt()
    ) {
      return -1;
    }
    if (
      Poseidon.hash(a.toFields()).toBigInt() >
      Poseidon.hash(b.toFields()).toBigInt()
    ) {
      return 1;
    }
    return 0;
  });

  let votersTree = MerkleTree.createFromFieldsArray(
    votersList.map((voter) => voter.toFields())
  );

  if (!votersTree) throw new Error('Error creating voters tree');

  let votersRoot = votersTree.getRoot();
  console.log(`Voters root: ${votersRoot.toString()}`);

  const publisherPubKey = publisherPrivateKey.toPublicKey();

  Election.setContractConstants({
    electionStartBlock: startBlock,
    electionFinalizeBlock: endBlock,
    votersRoot: votersRoot.toBigInt(),
  });

  console.time('Compile Vote Program');
  await Vote.Program.compile();
  console.timeEnd('Compile Vote Program');

  console.time('Compile Aggregate Program');
  await Aggregation.Program.compile();
  console.timeEnd('Compile Aggregate Program');

  console.time('Compile Election Contract');
  await Election.Contract.compile();
  console.timeEnd('Compile Election Contract');

  const electionContractPk = PrivateKey.random();
  console.log(electionContractPk.toBase58());
  const electionContractPubKey = electionContractPk.toPublicKey();
  console.log(electionContractPubKey.toBase58());

  const electionContractInstance = new Election.Contract(
    electionContractPubKey
  );

  const electionData = new Election.StorageLayerInfoEncoding({
    first: fileCoinDatas[0],
    last: fileCoinDatas[1],
  });

  const deployTx = await Mina.transaction(
    {
      sender: publisherPubKey,
      fee: 1e8,
    },
    async () => {
      AccountUpdate.fundNewAccount(publisherPubKey);
      await electionContractInstance.deploy();
      await electionContractInstance.initialize(
        electionData,
        storageLayerCommitment
      );
    }
  );

  deployTx.sign([publisherPrivateKey, electionContractPk]);

  await deployTx.prove();

  let pendingTransaction = await deployTx.send();

  if (pendingTransaction.status === 'rejected') {
    console.log('error sending transaction (see above)');
    process.exit(0);
  }

  console.log(
    `See transaction at https://minascan.io/devnet/tx/${pendingTransaction.hash}`
  );

  await pendingTransaction.wait();

  console.log('Contract deployed at', electionContractPubKey.toBase58());

  return { electionContractPk, electionContractInstance };
}
