'use client';

import { Dispatch, useContext, useEffect, useState, SetStateAction } from 'react';
import Image from 'next/image.js';
import { FaImage } from 'react-icons/fa';

import { types } from 'zkvot-core';

import Button from '@/app/(partials)/button.jsx';
import CopyButton from '@/app/(partials)/copy-button.jsx';

import { SubwalletContext } from '@/contexts/subwallet-context.jsx';
import { ToastContext } from '@/contexts/toast-context.jsx';

import { sendVoteViaBackend } from '@/utils/backend.js';
import { CommunicationLayerDetails } from '@/utils/constants.jsx';

import Clock from '@/public/elections/partials/clock-icon.jsx';

const ModeSelection = ({ selectionMode, handleModeSelectionClick }: {
  selectionMode: string;
  handleModeSelectionClick: (mode: 'direct' | 'backend') => void;
}) => {
  return (
    <div className='flex mb-6 w-full space-x-4'>
      <button
        onClick={() => handleModeSelectionClick('direct')}
        className={`focus:outline-none border-b-[1px] pb-1 ${selectionMode === 'direct'
          ? 'text-white pb-1 border-primary'
          : 'text-[#B7B7B7] border-transparent hover:border-[#B7B7B7]'
        }`}
      >
        Directly Through DA
      </button>
      <button
        onClick={() => handleModeSelectionClick('backend')}
        className={`focus:outline-none border-b-[1px] pb-1 ${selectionMode === 'backend'
          ? 'text-white border-primary'
          : 'text-[#B7B7B7] border-transparent hover:border-[#B7B7B7]'
        }`}
      >
        Through Our Backends
      </button>
    </div>
  );
};

const DASelection = ({
  communicationLayers,
  selectedDA,
  setSelectedDA,
  isSubmitting,
}: {
  communicationLayers: types.DaLayerInfo[];
  selectedDA: types.DaLayerInfo['name'] | '';
  setSelectedDA: (da: types.DaLayerInfo['name']) => void;
  isSubmitting: boolean;
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
      {communicationLayers.map((layer) => (
        <div
          key={layer.name}
          className={`p-4 bg-[#222222] rounded-2xl cursor-pointer flex items-center border-[1px] transition duration-200 ${selectedDA === layer.name || communicationLayers.length === 1
            ? 'border-primary shadow-lg'
            : 'border-transparent hover:bg-[#333333]'
          }`}
          onClick={() => !isSubmitting && setSelectedDA(layer.name)}
        >
          <div className='flex-shrink-0 mr-4'>
            {CommunicationLayerDetails[layer.name].logo || (
              <div className='w-12 h-12 bg-gray-500 rounded-full' />
            )}
          </div>
          <div className='flex flex-col h-full justify-between'>
            <h3 className='text-white text-[24px] mb-2'>
              {layer.name.charAt(0).toUpperCase() + layer.name.slice(1)}
            </h3>
            <p className='text-[16px] mb-2'>
              {CommunicationLayerDetails[layer.name].description ||
                'No description available.'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ({
  electionData,
  selectedOption,
  selectedDA,
  setSelectedDA,
  goToNextStep,
  zkProofData,
  setLoading,
}: {
  electionData: types.ElectionBackendData;
  selectedOption: number;
  selectedDA: types.DaLayerInfo['name'] | '';
  setSelectedDA: (da: types.DaLayerInfo['name']) => void;
  goToNextStep: () => void;
  zkProofData: string;
  setLoading: (loading: boolean) => void;
}) => {
  const { subwalletAccount, connectSubwallet, disconnectSubwallet, submitDataToAvailViaSubwallet, isSubmitting } = useContext(SubwalletContext);
  const { showToast } = useContext(ToastContext);

  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<'direct' | 'backend'>('direct');

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

  useEffect(() => {
    if (selectionMode === 'direct' && selectedDA === 'Avail' && subwalletAccount)
      setWalletAddress(subwalletAccount.address);
    else
      setWalletAddress('');

    if (selectedDA === 'Avail' && selectionMode === 'direct')
      setSelectedWallet('Subwallet');
    else
      setSelectedWallet('');
  }, [subwalletAccount, selectedDA, selectionMode]);

  useEffect(() => {
    setWalletAddress('');

    if (selectedDA === 'Avail')
      setSelectedWallet('Subwallet');
  }, [selectedDA, subwalletAccount, disconnectSubwallet]);

  useEffect(() => {
    if (CommunicationLayerDetails[electionData.communication_layers[0].name].submission_methods.includes('backend'))
      setSelectionMode('backend');
    else
      setSelectionMode('direct');
  }, [electionData]);

  const handleNext = async () => {
    if (!selectedDA) {
      showToast('Please select a DA Layer to proceed', 'error');
      return;
    }

    if (selectionMode === 'direct') {
      if (!subwalletAccount) {
        showToast('Please connect your wallet to proceed', 'error');
        return;
      }
      if (!zkProofData) {
        showToast('No vote proof found', 'error');
        return;
      }
    } else if (selectionMode === 'backend') {
      if (!zkProofData) {
        showToast('ZK proof data is missing. Please go back and generate it.', 'error');
        return;
      }
    }

    try {
      setLoading(true);

      if (selectionMode === 'direct') {
        let transactionSuccess = false;

        if (selectedDA === 'Avail')
          transactionSuccess = await submitDataToAvailViaSubwallet(zkProofData);

        if (transactionSuccess)
          goToNextStep();
        else
          throw new Error('Failed to submit vote to Avail');
      } else if (selectionMode === 'backend') {
        const response = await sendVoteViaBackend(
          zkProofData,
          electionData.mina_contract_id,
          selectedDA
        );

        if (response.success) { // TODO: bu zaten arkaplanda yapılıyor
          goToNextStep();
        } else {
          console.error(123,response);
          throw new Error(response);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error submitting vote:', error);
      showToast('Failed to submit vote. Please try again', 'error');
      setLoading(false);
    }
  };

  const handleModeSelectionClick = (mode: 'direct' | 'backend') => {
    if (!selectedDA) return;

    if (CommunicationLayerDetails[selectedDA].submission_methods.includes(mode))
      setSelectionMode(mode)
    else
      showToast('Not supported by zkVot yet', 'error');
  };

  const Placeholder = ({ className }: { className: string }) => (
    <div className={`${className} flex items-center justify-center h-full`}>
      <FaImage className='text-gray-500 text-6xl' />
    </div>
  );

  return (
    <div className='flex flex-col items-center px-8 sm:px-12 md:px-24 flex-grow py-12'>
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
                  />{' '}
                </span>
              </div>
            </div>
            <div className=' flex flex-col  w-full h-fit '>
              <h2 className='text-[24px] mb-2'>{electionData.question}</h2>
            </div>
            <div className='flex flex-col w-full'>
              <div className='text-[#B7B7B7] text-sm mb-2 flex flex-row items-center gap-2'>
                <Clock />
                {new Date(electionData.start_date).toLocaleDateString() + ' ' + new Date(electionData.start_date).getHours() + ':' + new Date(electionData.start_date).getMinutes() + ' - ' + new Date(electionData.end_date).toLocaleDateString() + ' ' + new Date(electionData.end_date).getHours() + ':' + new Date(electionData.end_date).getMinutes()}
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
      <ModeSelection handleModeSelectionClick={handleModeSelectionClick} selectionMode={selectionMode} />
      <DASelection communicationLayers={electionData.communication_layers} selectedDA={selectedDA} setSelectedDA={setSelectedDA} isSubmitting={isSubmitting} />
      <div className='w-full pt-8 flex justify-end'>
        {selectionMode === 'direct' ? (
          subwalletAccount ? (
            <Button
              onClick={handleNext}
              disabled={!selectedDA || isSubmitting}
              loading={isSubmitting}
            >
              Submit Vote
            </Button>
          ) : (
            <div
              className={`${!selectedDA ? 'hidden' : 'flex'}`}
            >
              <Button onClick={handleConnectWallet}>
                Connect {selectedWallet} Wallet
              </Button>
            </div>
          )
        ) : (
          <Button
            onClick={handleNext}
            disabled={!selectedDA || isSubmitting}
            loading={isSubmitting}
          >
            Submit Vote
          </Button>
        )}
      </div>
    </div>
  );
};
