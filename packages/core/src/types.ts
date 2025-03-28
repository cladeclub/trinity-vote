namespace typesNamespace {
  export interface DaLayerInfo {
    name: 'Avail' | 'Celestia',
    start_block_height: number
  };
  export type AvailDaLayerInfo = DaLayerInfo & {
    app_id: 101
  };
  export type AvailDataTx = {
    data: string
  };
  export type CelestiaDaLayerInfo = DaLayerInfo & {
    namespace: 'AAAAAAAAAAAAAAAAAAAAAAAAAGM1NjM4OWY5Yzk=',
    start_block_hash: string
  };
  export type CelestiaDataTx = {
    namespace: string,
    data: string,
    share_version: number,
    commitment: string,
    index: number
  };

  export type DaLayerSubmissionData = {
    election_id: string,
    nullifier: string,
    proof: string
  };

  export type VoterCustomFields = {
    [key: string]: string;
  };
  export type Voter = VoterCustomFields & {
    public_key: string;
  };

  export type StorageLayerPlatformCodes = 'A' | 'F';
  export type StorageLayerPlatformNames = 'Arweave' | 'Filecoin';
  export type CommunicationLayerNames = 'Avail' | 'Celestia';

  export type ElectionStaticData = {
    start_slot: number;
    end_slot: number;
    question: string;
    options: string[];
    description: string;
    image_raw: string;
    voters_list: Voter[];
    communication_layers: (AvailDaLayerInfo | CelestiaDaLayerInfo)[]
  };
  export type ElectionBackendData = {
    is_devnet: boolean;
    mina_contract_id: string;
    storage_layer_id: string;
    storage_layer_platform: StorageLayerPlatformCodes;
    start_slot: number;
    end_slot: number;
    question: string;
    options: string[];
    description: string;
    image_url: string;
    voters_list: Voter[];
    voters_merkle_root: string;
    communication_layers: (AvailDaLayerInfo | CelestiaDaLayerInfo)[],
    result: number[]
  };
};

export default typesNamespace;
