"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Lock, MoreVertical, Plus } from "lucide-react";

interface SmartPocketsCardProps {
  lockedSavingsEth: string;
  spendingBalanceEth: string;
  savingsPct: number;
  spendingPct: number;
  secondsUntilUnlock: bigint;
  onDepositClick: () => void;
  onWithdrawSavingsClick: () => void;
  onWithdrawSpendingClick: () => void;
  avatarsLeft: string[];
  avatarsRight: string[];
}

function AvatarStack({
  avatars,
  label,
}: {
  avatars: string[];
  label: string;
}) {
  return (
    <div className="flex items-center -space-x-2 shrink-0">
      {avatars.map((src, i) => (
        <img
          key={i}
          src={src}
          alt="User"
          className="w-[22px] h-[22px] rounded-full object-cover ring-[1.5px] ring-[#14161D] outline outline-1 outline-white/10"
        />
      ))}
      <div className="w-[22px] h-[22px] rounded-full bg-[#252834] ring-[1.5px] ring-[#14161D] flex items-center justify-center text-[9px] font-semibold text-white/85 tabular-nums">
        {label}
      </div>
    </div>
  );
}

export default function SmartPocketsCard({
  lockedSavingsEth,
  spendingBalanceEth,
  savingsPct,
  spendingPct,
  secondsUntilUnlock,
  onDepositClick,
  onWithdrawSavingsClick,
  onWithdrawSpendingClick,
  avatarsLeft,
  avatarsRight,
}: SmartPocketsCardProps) {
  const daysRemaining =
    secondsUntilUnlock > BigInt(0)
      ? `${Math.ceil(Number(secondsUntilUnlock) / 86400)}d Lock`
      : "Locked";

  return (
    <div className="rounded-[22px] bg-[#12141B] border border-white/[0.07] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-white">Smart Pockets</h2>
        <div className="flex items-center gap-2">
          <span className="text-[12px] tabular-nums">
            <span className="text-white font-medium">02</span>{" "}
            <span className="text-[#6E7381]">of 3</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onWithdrawSavingsClick}
              title="Withdraw Locked Savings On-Chain"
              className="w-[25px] h-[25px] rounded-full bg-[#1A1D26] border border-white/[0.07] flex items-center justify-center text-white/65 hover:text-white transition-transform active:scale-[0.96]"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
            <button
              onClick={onWithdrawSpendingClick}
              title="Withdraw Spending Balance On-Chain"
              className="w-[25px] h-[25px] rounded-full bg-[#1A1D26] border border-white/[0.07] flex items-center justify-center text-white/65 hover:text-white transition-transform active:scale-[0.96]"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2 Inner Concentric Cards */}
      <div className="grid grid-cols-2 gap-3 mt-3.5">
        {/* Left Mini Card: Locked Savings (20%) */}
        <div className="rounded-[15px] bg-[#191B23] border border-white/[0.06] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-white truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0" />
                <span className="truncate">Savings Vault</span>
              </div>
              <button
                onClick={onWithdrawSavingsClick}
                title="Withdraw Locked Savings On-Chain"
                className="w-5 h-5 rounded-full bg-[#232632] flex items-center justify-center text-white/65 hover:text-white shrink-0"
              >
                <Lock className="w-2.5 h-2.5 text-[#60A5FA]" />
              </button>
            </div>

            <div className="mt-2.5 text-[12px] font-semibold text-white tabular-nums">
              <span className="text-[#3B82F6] mr-0.5">#</span>
              {lockedSavingsEth} ETH
            </div>
            <div className="mt-0.5 text-[11px] font-medium tabular-nums">
              <span className="text-[#3B82F6]">+ </span>
              <span className="text-white/90">{savingsPct}%</span>
              <span className="text-[#6E7381]"> ({daysRemaining})</span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between">
            <AvatarStack avatars={avatarsLeft} label={`${savingsPct}%`} />
            <button
              onClick={onDepositClick}
              title="Deposit Salary On-Chain"
              className="w-[25px] h-[25px] rounded-full bg-white text-[#0B0C0F] flex items-center justify-center shadow hover:bg-white/90 transition-transform active:scale-[0.96]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Mini Card: Spending Balance (70%) */}
        <div className="rounded-[15px] bg-[#191B23] border border-white/[0.06] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-white truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] shrink-0" />
                <span className="truncate">Spending Vault</span>
              </div>
              <button
                onClick={onWithdrawSpendingClick}
                title="Withdraw Spending Balance On-Chain"
                className="w-5 h-5 rounded-full bg-[#232632] flex items-center justify-center text-white/65 hover:text-white shrink-0"
              >
                <MoreVertical className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="mt-2.5 text-[12px] font-semibold text-white tabular-nums">
              <span className="text-[#3B82F6] mr-0.5">#</span>
              {spendingBalanceEth} ETH
            </div>
            <div className="mt-0.5 text-[11px] font-medium tabular-nums">
              <span className="text-[#3B82F6]">+ </span>
              <span className="text-white/90">{spendingPct}%</span>
              <span className="text-[#6E7381]"> (Unlocked)</span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between">
            <AvatarStack avatars={avatarsRight} label={`${spendingPct}%`} />
            <button
              onClick={onDepositClick}
              title="Deposit Salary On-Chain"
              className="w-[25px] h-[25px] rounded-full bg-white text-[#0B0C0F] flex items-center justify-center shadow hover:bg-white/90 transition-transform active:scale-[0.96]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
