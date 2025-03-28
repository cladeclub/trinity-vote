'use client';

import { useContext, useState, useEffect } from 'react';
import Image from 'next/image.js';
import { FaImage } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

import { types } from 'zkvot-core';

import Button from '@/app/(partials)/button.jsx';
import CopyButton from '@/app/(partials)/copy-button.jsx';
import DateFormatter from '@/app/(partials)/date-formatter.jsx';
import LoadingOverlay from '@/app/(partials)/loading-overlay.jsx';
import ToolTip from '@/app/(partials)/tool-tip.jsx';

import { SubwalletContext } from '@/contexts/subwallet-context.jsx';
import { ToastContext } from '@/contexts/toast-context.jsx';

import encodeDataToBase64String from '@/utils/encodeDataToBase64String';
import { sendVoteViaBackend } from '@/utils/backend.js';
import { CommunicationLayerDetails } from '@/utils/constants.jsx';
import { calculateTimestampFromSlot } from '@/utils/o1js.js';

import LearnMoreIcon from '@/public/elections/partials/learn-more-icon.jsx';
import Clock from '@/public/elections/partials/clock-icon.jsx';

const ModeSelection = ({ selectionMode, setSelectionMode }: {
  selectionMode: string;
  setSelectionMode: (mode: 'direct' | 'backend') => void;
}) => {
  return (
    <div className='flex mb-6 w-full space-x-4'>
      <button
        onClick={() => setSelectionMode('backend')}
        className={`focus:outline-none flex items-center gap-2 border-b-[1px] pb-1 ${selectionMode === 'backend'
          ? 'text-white border-primary'
          : 'text-[#B7B7B7] border-transparent hover:border-[#B7B7B7]'
        }`}
      >
        Through Our Backends (Free of Charge)
        <ToolTip
          content='By allowing to submit your votes to the DA through our backend ports, we eliminate any risk of identity exposure related to your DA wallet address (plus it is free :D). However, this option is only partially decentralized, as you rely on our backend servers. In the future, zkVot will also allow custom parties to host their own backend servers to maximize decentralization.'
          position='top'
          arrowPosition='start'
        >
          <LearnMoreIcon color='#B7B7B7' />
        </ToolTip>
      </button>
      <button
        onClick={() => setSelectionMode('direct')}
        className={`focus:outline-none flex items-center gap-2 border-b-[1px] pb-1 ${selectionMode === 'direct'
          ? 'text-white pb-1 border-primary'
          : 'text-[#B7B7B7] border-transparent hover:border-[#B7B7B7]'
        }`}
      >
        Directly Through DA
        <ToolTip
          content='Sending through DA yourself eliminates any risk of censorship during the vote submission process. However, be careful using this option, as your vote is associated with the wallet address you use in the DA layer once you submit it. You can use a private network to anonymize your funds.'
          position='top'
          arrowPosition='start'
        >
          <LearnMoreIcon color='#B7B7B7' />
        </ToolTip>
      </button>
    </div>
  );
};

const DASelection = ({
  communicationLayers,
  selectedDA,
  setSelectedDA,
  isSubmitting,
  selectionMode,
  downloadVoteProof,
}: {
  communicationLayers: types.DaLayerInfo[];
  selectedDA: types.DaLayerInfo['name'];
  setSelectedDA: (da: types.DaLayerInfo['name']) => void;
  isSubmitting: boolean;
  selectionMode: 'direct' | 'backend';
  downloadVoteProof: () => void;
}) => {
  const renderCelestiaDirectSubmissionInfo = () => (
    <div className="mt-6 bg-[#222222] rounded-2xl p-6 border w-full border-primary">
    <div className="flex items-start space-x-4">
      <div className="flex-grow">
        <h4 className="text-white text-lg font-semibold mb-2">Celestia Direct Submission</h4>
        <p className="text-gray-300 mb-4">
          zkVot doesn't support direct submission to Celestia yet. You can      <button
            onClick={(e) => {
              e.preventDefault();
              downloadVoteProof();
            }}
            className="inline-flex items-center text-white rounded-md hover:bg-primary-dark transition duration-200 underline"
          >
            Download
          </button> your vote and submit it manually.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">

          <a
            href="https://celenium.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-[#333333] text-white rounded-md hover:bg-[#444444] transition duration-200"
          >
            Submit on celenium.io
          </a>
        </div>
        <div className="mt-4 bg-[#333333] rounded-lg p-3">
          <div className="text-white text-sm flex space-x-1">
            <span className="font-semibold">Namespace:</span>
            <span className='flex items-center'>
              {(communicationLayers.find(layer => layer.name === 'Celestia') as types.CelestiaDaLayerInfo).namespace || 'N/A'}
              <span className='ml-1 cursor-pointer w-fit'>
                <CopyButton
                  textToCopy={(communicationLayers.find(layer => layer.name === 'Celestia') as types.CelestiaDaLayerInfo).namespace || 'N/A'}
                  iconColor='#F6F6F6'
                  position={{ top: -26, left: -38 }}
                  />
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );

  const renderLayerGrid = () => (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-4 w-full ${
        isSubmitting ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      }`}
    >
      {communicationLayers.map(layer => (
        <div
          key={layer.name}
          className={`p-4 bg-[#222222] rounded-2xl cursor-pointer flex items-center border-[1px] transition duration-200 ${
            selectedDA === layer.name || communicationLayers.length === 1
              ? "border-primary shadow-lg"
              : "border-transparent hover:bg-[#333333]"
          }`}
          onClick={() => !isSubmitting && setSelectedDA(layer.name)}
        >
          <div className="flex-shrink-0 mr-4">
            {CommunicationLayerDetails[layer.name].logo || (
              <div className="w-12 h-12 bg-gray-500 rounded-full" />
            )}
          </div>
          <div className="flex flex-col h-full justify-between">
            <h3 className="text-white text-[24px] mb-2">
              {layer.name.charAt(0).toUpperCase() + layer.name.slice(1)}
            </h3>
            <p className="text-[16px] mb-2">
              {CommunicationLayerDetails[layer.name].description ||
                "No description available."}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {renderLayerGrid()}
      {selectionMode === "direct" && selectedDA === "Celestia"
        ? renderCelestiaDirectSubmissionInfo()
        : null}
    </>
  );
};


export default ({
  electionData,
  selectedOption,
  loading,
  daLayerSubmissionData,
  goToNextStep,
  goToPrevStep,
  setLoading,
}: {
  electionData: types.ElectionBackendData;
  selectedOption: number;
  loading: boolean;
  daLayerSubmissionData: types.DaLayerSubmissionData;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  setLoading: (loading: boolean) => void;
}) => {
  const { subwalletAccount, connectSubwallet, submitDataToAvailViaSubwallet, isSubmitting } = useContext(SubwalletContext);
  const { showToast } = useContext(ToastContext);

  // electionData.communication_layers = [
  //   {
  //     name: 'Avail',
  //     start_block_height: 123,
  //     app_id: 101
  //   },
  //   {
  //     name: 'Celestia',
  //     namespace: 'fldsşd',
  //     start_block_height: 123,
  //     start_block_hash: 'fldsşigd'
  //   }
  // ];

  const [selectionMode, setSelectionMode] = useState<'direct' | 'backend'>('backend');
  const [selectedDA, setSelectedDA] = useState<types.DaLayerInfo['name']>(electionData.communication_layers[0].name);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [isPopupConfirmed, setIsPopupConfirmed] = useState<boolean>(false);
  const [electionDates, setElectionDates] = useState<{
    start_date: Date;
    end_date: Date;
  } | null>(null);

  useEffect(() => {
    if (!electionData) return;

    calculateTimestampFromSlot(electionData.start_slot, electionData.end_slot)
      .then((dates) => setElectionDates({
        start_date: dates.start_date,
        end_date: dates.end_date
      }))
  }, [electionData]);

  const formatAndGetDaLayerSubmissionData = (callback: (err: string | null, data?: string | undefined) => any) => {
    encodeDataToBase64String(JSON.stringify(daLayerSubmissionData), callback);
  };

  const downloadVoteProof = () => {
    formatAndGetDaLayerSubmissionData((err, data) => {
      if (err || !data) {
        console.error('Error encoding data to base64:', err);
        showToast('Failed to generate the vote, please go to previous step and try again', 'error');
        return;
      }

      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = 'zkvot-vote-proof-' + electionData.mina_contract_id + '.txt';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleConnectWallet = async () => {
    try {
      console.log('Connecting wallet...');
      await connectSubwallet();
      console.log('Wallet connection initiated.');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      showToast('Failed to connect wallet. Please try again', 'error');
    }
  };

  const handlePopupConfirm = () => {
    setIsPopupConfirmed(true);
    setIsPopupOpen(false);
    handleNext();
  };

  const handleNext = async () => {
    if (!selectedDA) {
      showToast('Please select a DA Layer to proceed', 'error');
      return;
    }

    if (selectionMode === 'direct') {
      if (selectedDA === 'Avail') {
        if (!subwalletAccount) {
          showToast('Please connect your wallet to proceed', 'error');
          return;
        }

        setLoading(true);

        formatAndGetDaLayerSubmissionData(async (err, data) => {
          if (err || !data) {
            console.error('Error encoding data to base64:', err);
            setLoading(false);
            showToast('Failed to generate the vote, please go to previous step and try again', 'error');
            return;
          }

          try {
            const transactionSuccess = await submitDataToAvailViaSubwallet(data);

            if (transactionSuccess) {
              setLoading(false);
              goToNextStep();
            } else {
              setLoading(false);
              showToast('Failed to submit the vote, please try again later', 'error');
            }
          } catch (err) {
            console.error('Error submitting vote:', err);
            setLoading(false);
            showToast('Failed to submit the vote, please try again later', 'error');
          }
        });
      } else if (selectedDA === 'Celestia') {
        if (isPopupConfirmed)
          goToNextStep();
        else
          setIsPopupOpen(true);
        return;
      };
    } else if (selectionMode === 'backend') {
      setLoading(true);

      try {
        await sendVoteViaBackend(
          daLayerSubmissionData,
          electionData.mina_contract_id,
          selectedDA
        );

        showToast('Your vote submitted succesfully! Please note that it may take a few minutes until it is counted', 'success');
        setLoading(false);
        goToNextStep();
      } catch (err) {
        console.error('Error submitting vote:', err);
        setLoading(false);
        showToast('Failed to submit the vote, please try again later', 'error');
      };
    };
  };

  const Placeholder = ({ className }: { className: string }) => (
    <div className={`${className} flex items-center justify-center h-full`}>
      <FaImage className='text-gray-500 text-6xl' />
    </div>
  );

  return (
    <div className='flex flex-col items-center px-4 sm:px-6 md:px-8 flex-grow  h-full justify-between'>
      {loading && <LoadingOverlay text='Submitting the vote...' />}
      <div className='w-full flex flex-col items-center'>
        <div className='flex flex-col items-start w-full h-fit text-white mb-6 bg-[#222222] p-5 rounded-[30px] '>
          <div className='flex flex-col md:flex-row w-full h-fit '>
            <div className='w-full md:w-1/4 flex'>
              <div className='flex w-full h-32 rounded-3xl overflow-hidden'>
                <div className='w-full relative'>
                  {electionData.image_url.length ? (
                    <div className='w-full h-full relative'>
                      <Image
                        src={electionData.image_url}
                        alt='Candidate 1'
                        fill
                        style={{ objectFit: 'cover' }}
                        className='rounded-l-lg'
                      />
                    </div>
                  ) : (
                    <Placeholder className='rounded-l-lg' />
                  )}
                </div>
              </div>
            </div>
            <div className='px-4 w-full h-fit flex flex-col justify-start'>
              <div className='flex flex-row w-full justify-between '>
                <div className='text-[#B7B7B7] text-sm mb-2 flex flex-row items-center '>
                  Election id:{' '}
                  {String(electionData.mina_contract_id).slice(0, 12) + '...'}
                  <span className='ml-1 cursor-pointer w-fit'>
                    <CopyButton
                      textToCopy={electionData.mina_contract_id}
                      iconColor='#F6F6F6'
                      position={{ top: -26, left: -38 }}
                    />
                  </span>
                </div>
              </div>
              <div className=' flex flex-col  w-full h-fit '>
                <h2 className='text-[24px] mb-2'>{electionData.question}</h2>
              </div>
              <div className='flex flex-col w-full'>
                <div className='text-[#B7B7B7] text-sm mb-2 flex flex-row items-center gap-2'>
                  <Clock />
                  <DateFormatter date={electionDates?.start_date} /> -{' '}
                  <DateFormatter date={electionDates?.end_date} />
                </div>
              </div>
              <div className='flex flex-col w-full'>
                <div className='text-[#B7B7B7] text-sm mb-2 flex flex-row items-center '>
                  {electionData.voters_list.length} Voters
                </div>
              </div>
            </div>
          </div>
          <div className='pt-4 pb-2 w-full'>
            <h3 className='text-[16px] text-[#B7B7B7] mb-4'>Your Choice</h3>
            <div className='pl-4 rounded text-[20px]'>
              {electionData.options[selectedOption]}
            </div>
          </div>
        </div>
        <ModeSelection
          setSelectionMode={setSelectionMode}
          selectionMode={selectionMode}
        />
        <DASelection
          selectionMode={selectionMode}
          communicationLayers={electionData.communication_layers}
          selectedDA={selectedDA}
          setSelectedDA={setSelectedDA}
          isSubmitting={isSubmitting}
          downloadVoteProof={downloadVoteProof}
        />
      </div>
        <div className='w-full pt-8 flex justify-between'>
          <Button
            onClick={goToPrevStep}
            variant='back'
            className='mr-4'
          >
            Back
          </Button>
          {selectionMode === 'direct' ? (
            selectedDA === 'Avail' ? (
              !subwalletAccount ? (
                <div className={`${!selectedDA ? 'hidden' : 'flex'}`}>
                  <Button onClick={handleConnectWallet}>
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!selectedDA || isSubmitting}
                  loading={isSubmitting}
                >
                  Submit Vote
                </Button>
              )
            ) : selectedDA === 'Celestia' ? (
              <Button
                onClick={handleNext}
                disabled={!selectedDA || isSubmitting}
                loading={isSubmitting}
              >
                Continue
              </Button>
            ) : null
          ) : selectionMode === 'backend' ? (
            <Button
              onClick={handleNext}
              disabled={!selectedDA || isSubmitting}
              loading={isSubmitting}
            >
              Submit Vote
            </Button>
          ) : null}
        </div>

      {isPopupOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-[#141414] rounded-[50px] p-8 shadow-lg w-[680px] h-auto border-[1px] border-primary text-center relative'>
            <button
              onClick={() => setIsPopupOpen(false)}
              className='flex w-full justify-end'
            >
              <IoClose size={28} />
            </button>
            <div className='px-[57px] py-2'>
              <h3 className='text-xl mb-4'>
                Manual Vote Submission Required
              </h3>
              <p className='mb-8'>
                Please make sure you submitted your vote manually before continuing.
              </p>
              <div className='flex justify-center pt-9'>
                <Button
                  onClick={handlePopupConfirm}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
