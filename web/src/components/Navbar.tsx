"use client";

import React from "react";
import {
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
} from "lucide-react";

interface NavbarProps {
  connectedAccount: string | null;
  walletEthBalance: string;
  baseBlockTimestamp: bigint;
  reactiveBlockNumber: bigint;
  onConnectWallet: () => void;
  onOpenModal: () => void;
  avatarUrl: string;
}

export default function Navbar({
  connectedAccount,
  walletEthBalance,
  baseBlockTimestamp,
  reactiveBlockNumber,
  onConnectWallet,
  onOpenModal,
  avatarUrl,
}: NavbarProps) {
  return (
    <header className="h-[62px] w-full border-b border-white/[0.07] flex items-center shrink-0">
      {/* Top-Left Logo Cell */}
      <div className="w-[62px] h-full border-r border-white/[0.07] flex items-center justify-center shrink-0">
        <svg
          width="25"
          height="21"
          viewBox="0 0 26 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 11.5C3.5 6.8 6.8 4 11.5 4H23.5L21.3 9.2H10.2C8.7 9.2 7.8 10.1 7.8 11.5H3.5Z"
            fill="white"
          />
          <path d="M3.5 13.8H18.8L16.8 18.6H3.5V13.8Z" fill="white" />
        </svg>
      </div>

      {/* Top Bar Content */}
      <div className="flex-1 h-full px-7 flex items-center justify-between">
        {/* Left: Dashboard Dropdown */}
        <button
          onClick={onOpenModal}
          className="flex items-center gap-2 text-[14.5px] font-medium text-white/95 hover:text-white transition-opacity whitespace-nowrap"
        >
          <span>Dashboard</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 stroke-[2]" />
        </button>

        {/* Right Group: Network Bar, Omni Block Pill, Block Timestamp Pill, Wallet Profile */}
        <div className="flex items-center gap-3.5">
          {/* Network Status Pill */}
          <div className="w-[274px] h-[37px] rounded-full bg-[#15171E] border border-white/[0.06] pl-3.5 pr-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px]">
              <Search className="w-3.5 h-3.5 text-white/75 stroke-[2]" />
              <div>
                <span className="text-white font-medium">Base</span>
                <span className="text-[#6E7381]">
                  {" "}
                  Sepolia &lt;-&gt; Omni (~1s)
                </span>
              </div>
            </div>
            <button
              onClick={onOpenModal}
              title="Open Contract & Rule Settings"
              className="w-[25px] h-[25px] rounded-full bg-[#242733] hover:bg-[#2E3240] flex items-center justify-center text-white/75 transition-transform active:scale-[0.96]"
            >
              <ArrowUp className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>

          {/* Reactive Omni Live Block Pill */}
          <button
            onClick={onOpenModal}
            className="h-[37px] px-3.5 rounded-full bg-[#15171E] border border-white/[0.06] hover:border-white/15 flex items-center gap-2 transition-transform active:scale-[0.96]"
          >
            <div className="relative">
              <Bell className="w-3.5 h-3.5 text-white/85 stroke-[1.8]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] absolute -top-0.5 -right-0.5" />
            </div>
            <span className="text-[12px] font-medium text-white tabular-nums whitespace-nowrap">
              {reactiveBlockNumber > BigInt(0)
                ? `Omni #${reactiveBlockNumber.toString()}`
                : "Omni ~1s Live"}
            </span>
          </button>

          {/* Live Base Sepolia block.timestamp Pill */}
          <div className="h-[37px] px-3.5 rounded-full bg-[#15171E] border border-white/[0.06] flex items-center gap-2.5">
            <ChevronLeft className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[12px] font-medium text-white/90 tabular-nums whitespace-nowrap">
              {baseBlockTimestamp > BigInt(0)
                ? `TS: ${baseBlockTimestamp.toString()}`
                : "block.timestamp"}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
          </div>

          {/* User Profile / MetaMask Connect */}
          <div
            onClick={onConnectWallet}
            title="Connect MetaMask to Base Sepolia (84532)"
            className="flex items-center gap-2.5 pl-1.5 cursor-pointer group"
          >
            <img
              src={avatarUrl}
              alt="Wallet Profile"
              className="w-[35px] h-[35px] rounded-full object-cover outline outline-1 outline-white/15 group-hover:outline-[#3B82F6] transition-all"
            />
            <div className="leading-tight">
              <div className="flex items-center gap-1 text-[13.5px] font-semibold text-white whitespace-nowrap">
                <span>{connectedAccount || "Connect Wallet"}</span>
                <ChevronDown className="w-3 h-3 text-white/60" />
              </div>
              <div className="text-[11px] text-[#6E7381] tabular-nums whitespace-nowrap">
                {connectedAccount
                  ? `${walletEthBalance} ETH (84532)`
                  : "Base Sepolia"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
