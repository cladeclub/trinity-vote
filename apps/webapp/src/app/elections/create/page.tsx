"use client";

import { useContext, useEffect, useState } from "react";

import { types, utils } from "zkvot-core";

import { ZKProgramCompileContext } from "@/contexts/zk-program-compile-context.jsx";

import ElectionInfoStep from "@/app/elections/create/(steps)/1-election-info.jsx";
import VotersListStep from "@/app/elections/create/(steps)/2-voters-list.jsx";
import CommLayerSelectionStep from "@/app/elections/create/(steps)/3-comm-layer-selection.jsx";
import StorageLayerSelectionStep from "@/app/elections/create/(steps)/4-storage-layer-selection.jsx";
import StorageLayerSubmissionStep from "@/app/elections/create/(steps)/5-storage-layer-submission.jsx";
import DeployElectionStep from "@/app/elections/create/(steps)/6-deploy-election.jsx";

const HomePage = () => {
  const { isVoteProgramCompiled, compileAggregationProgramIfNotCompiled } = useContext(ZKProgramCompileContext);

  const [step, setStep] = useState<number>(1);
  const [electionData, setElectionData] = useState<types.ElectionStaticData>({
    start_slot: 0,
    end_slot: 0,
    question: "",
    options: [],
    description: "",
    image_raw: "",
    voters_list: [],
    communication_layers: [],
  });
  const [storageLayerPlatform, setStorageLayerPlatform] = useState<types.StorageLayerPlatformCodes>("A");
  const [storageLayerId, setStorageLayerId] = useState<string>("");

  // IMPORTANT!!!! For easy testing DO NOT delete IMPORTANT!!!!
  // useEffect(() => {
  //   utils.fetchDataFromStorageLayer({
  //     platform: 'F',
  //     // id: 'bafkreiecgx2jxfh6o4sgntasljgyxyj6a36irad6phvbvu2ppfmvbomhra'
  //     id: 'bafkreianqmbzkk3teruaazk5tlqvkqli47xccjnkrjpgezdqihocwymw54'
  //   }, (err, data) => {
  //     if (err || !data) {
  //       console.error(err);
  //       return;
  //     }

  //     setElectionData(data);
  //     setStorageLayerPlatform('F');
  //     setStorageLayerId('bafkreianqmbzkk3teruaazk5tlqvkqli47xccjnkrjpgezdqihocwymw54');
  //     setStep(7);
  //   });
  // }, []);

  useEffect(() => {
    if (isVoteProgramCompiled)
      compileAggregationProgramIfNotCompiled();
  }, [isVoteProgramCompiled]);

  return (
    <div className="flex justify-center items-center h-full overflow-y-scroll pb-2">
      <div className="w-[1062px] h-full p-6 rounded-lg ">
        {step === 1 && (
          <ElectionInfoStep
            onNext={(data: types.ElectionStaticData) => {
              setElectionData(data);
              setStep(2);
            }}
            initialData={electionData}
          />
        )}
        {step === 2 && (
          <VotersListStep
            onPrevious={() => setStep(1)}
            onNext={(data: types.ElectionStaticData) => {
              setElectionData(data);
              setStep(3);
            }}
            initialData={electionData}
          />
        )}
        {step === 3 && (
          <CommLayerSelectionStep
            onPrevious={() => setStep(2)}
            onNext={(data: types.ElectionStaticData) => {
              setElectionData(data);
              setStep(4);
            }}
            initialData={electionData}
          />
        )}
        {step === 4 && (
          <StorageLayerSelectionStep
            onPrevious={() => setStep(3)}
            onNext={(data: {
              election: types.ElectionStaticData;
              storage_layer_platform: types.StorageLayerPlatformCodes;
            }) => {
              setStorageLayerPlatform(data.storage_layer_platform);
              setStep(5);
            }}
            initialData={electionData}
          />
        )}
        {step === 5 && (
          <StorageLayerSubmissionStep
            onPrevious={() => setStep(4)}
            onNext={(data: {
              election: types.ElectionStaticData;
              storage_layer_platform: types.StorageLayerPlatformCodes[keyof types.StorageLayerPlatformCodes];
              storage_layer_id: string;
            }) => {
              setStorageLayerId(data.storage_layer_id);
              setStep(6);
            }}
            initialData={{
              election: electionData,
              storage_layer_platform: storageLayerPlatform,
            }}
          />
        )}
        {step === 6 && (
          <DeployElectionStep
            onPrevious={() => setStep(5)}
            data={{
              election: electionData,
              storage_layer_platform: storageLayerPlatform,
              storage_layer_id: storageLayerId,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
