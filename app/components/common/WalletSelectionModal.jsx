import React from "react";
import { IoClose } from "react-icons/io5";
import MinaIcon from "../../assets/wallets/Mina.png";
import KeplrIcon from "../../assets/wallets/Keplr.svg";
import SubwalletIcon from "../../assets/wallets/Subwallet.svg";
import MetamaskIcon from "../../assets/wallets/Metamask.svg";
import Image from "next/image";

const WalletSelectionModal = ({
  onClose,
  onSelectWallet,
  availableWallets,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ">
    <div className="bg-[#141414] rounded-[50px] p-8 shadow-lg px-24 py-28 border-[1px] border-primary text-center relative">
      <button
        onClick={onClose}
        className="absolute flex w-full justify-end right-12 top-12"
      >
        <IoClose size={28} />
      </button>
      <div className="w-full h-full flex flex-col justify-center items-center">
        <h3 className="text-xl mb-8">Select Wallet</h3>
        <div className=" flex flex-row justify-center space-x-[24px]">
          <div className="flex flex-col space-y-[20px]">
            {availableWallets.includes("Mina") && (
              <button
                className="w-[216px] h-[54px] flex justify-start items-center rounded-3xl bg-[#222222] hover:bg-[#333333] text-white hover:text-[#91C1F2] gap-[23px] px-3 transition-colors duration-300"
                onClick={() => onSelectWallet("Mina")}
              >
                <Image
                  src={MinaIcon}
                  alt="Mina Wallet"
                  width={24}
                  height={24}
                />
                Mina Wallet
              </button>
            )}
            {availableWallets.includes("Metamask") && (
              <button
                className="w-[216px] h-[54px] flex justify-start items-center rounded-3xl bg-[#222222] hover:bg-[#333333] text-white hover:text-[#F6851A] gap-[23px] px-3 transition-colors duration-300"
                onClick={() => onSelectWallet("Metamask")}
              >
                <Image
                  src={MetamaskIcon}
                  alt="Metamask Wallet"
                  width={24}
                  height={24}
                />
                Metamask
              </button>
            )}
          </div>
          <div className="flex flex-col  space-y-[20px]">
            {availableWallets.includes("Keplr") && (
              <button
                className="w-[216px] h-[54px] flex justify-start items-center rounded-3xl bg-[#222222] hover:bg-[#333333] text-white hover:text-[#4493F9] gap-[23px] px-3 transition-colors duration-300"
                onClick={() => onSelectWallet("Keplr")}
              >
                <Image
                  src={KeplrIcon}
                  alt="Keplr Wallet"
                  width={24}
                  height={24}
                />
                Keplr Wallet
              </button>
            )}
            {availableWallets.includes("Subwallet") && (
              <button
                className="w-[216px] h-[54px] flex justify-start items-center rounded-3xl bg-[#222222] hover:bg-[#333333] text-white hover:text-[#4BE8AD] gap-[23px] px-3 transition-colors duration-300"
                onClick={() => onSelectWallet("Subwallet")}
              >
                <Image
                  src={SubwalletIcon}
                  alt="Subwallet"
                  width={24}
                  height={24}
                />
                Subwallet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default WalletSelectionModal;
