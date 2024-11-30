namespace typesNamespace {
  export interface DaLayerInfo {
    name: 'avail' | 'celestia',
    start_block_height: number
  };

  export interface AvailDaLayerInfo extends DaLayerInfo {
    app_id: number
  };

  export type AvailDataTx = {
    data: string
  };

  export interface CelestiaDaLayerInfo extends DaLayerInfo {
    namespace: string,
    start_block_hash: string
  };

  export type CelestiaDataTx = {
    namespace: string,
    data: string,
    share_version: number,
    commitment: string,
    index: number
  };

  export type Voter = {
    public_key: string;
  } & VoterCustomFields;

  export type VoterCustomFields = {
    [key: string]: string;
  };

  export type ElectionStaticData = {
    start_date: Date;
    end_date: Date;
    question: string;
    options: string[];
    description: string;
    image_raw: string;
    voters_list: Voter[];
    communication_layers: (AvailDaLayerInfo | CelestiaDaLayerInfo)[]
  };
  export type ElectionFrontendData = ElectionStaticData & {
    storage_layer_platform: ['A', 'F', 'P'];
  };
  export type ElectionBackendData = {
    mina_contract_id: string;
    storage_layer_id: string;
    storage_layer_platform: ['A', 'F', 'P'];
    start_date: Date;
    end_date: Date;
    question: string;
    options: string[];
    description: string;
    image_url: string;
    voters_list: Voter[];
    voters_merkle_root: bigint;
    communication_layers: (AvailDaLayerInfo | CelestiaDaLayerInfo)[]
  };
};

export default typesNamespace;