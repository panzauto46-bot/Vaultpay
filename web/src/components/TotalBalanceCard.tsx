"use client";

import React from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import ReactiveEngineCard from "./ReactiveEngineCard";

interface TotalBalanceCardProps {
  vaultTotalEth: string;
  totalBillsPaidEth: string;
  maxSafeEth: string;
  billsPct: number;
  engineText: string;
  isBusy: boolean;
  onDepositSalary: () => void;
  onOpenRuleModal: () => void;
}

export default function TotalBalanceCard({
  vaultTotalEth,
  totalBillsPaidEth,
  maxSafeEth,
  billsPct,
  engineText,
  isBusy,
  onDepositSalary,
  onOpenRuleModal,
}: TotalBalanceCardProps) {
  return (
    <div className="col-span-12 md:col-span-7 flex flex-col justify-between">
      {/* Section Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-white leading-snug">
            Total Balance
          </h2>
          <p className="text-[12px] text-[#6E7381] mt-0.5">
            The sum of all amounts on{" "}
            <span className="text-white/85 font-medium">VaultPayCore.sol</span>
          </p>
        </div>

        <button
          onClick={onDepositSalary}
          className="h-[34px] px-3.5 rounded-full bg-[#171922] border border-white/[0.08] flex items-center gap-2 text-[12px] font-medium text-white/90 hover:border-white/20 transition-colors whitespace-nowrap shrink-0"
        >
          <span>+ Deposit Salary</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/60" />
        </button>
      </div>

      {/* Total Balance Main Card */}
      <div className="mt-4 rounded-[22px] bg-[#12141B] border border-white/[0.07] p-5 flex-1 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        {/* Upper Balance Summary */}
        <div className="px-1">
          <div className="flex items-start justify-between">
            <div className="flex items-baseline tabular-nums">
              <span className="text-[#3B82F6] text-[25px] font-normal mr-1.5">
                Ξ
              </span>
              <span className="text-[31px] leading-none font-semibold tracking-tight text-white">
                {vaultTotalEth}
              </span>
              <span className="ml-2 text-[13px] text-[#6E7381] font-medium">
                ETH
              </span>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-[#6E7381]">
                Safe withdraw limit
              </div>
              <div className="text-[12.5px] font-semibold text-white mt-0.5 tabular-nums">
                {maxSafeEth}{" "}
                <span className="text-[#6E7381] font-normal">ETH</span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1 tabular-nums">
              <span className="text-[#6E7381]">
                Auto-paid bills ({billsPct}%):
              </span>
              <span className="text-white font-medium ml-0.5">
                {totalBillsPaidEth} ETH
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#3B82F6] stroke-[2.2]" />
            </div>

            <button
              onClick={onOpenRuleModal}
              className="flex items-center gap-1.5 text-white/90 hover:text-white font-medium transition-opacity"
            >
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] font-bold flex items-center justify-center text-white">
                ?
              </span>
              <span>Configure &amp; Deploy</span>
            </button>
          </div>
        </div>

        {/* Inner Concentric Card: Reactive Omni 3D Swirled Cobalt Sphere */}
        <ReactiveEngineCard
          engineText={engineText}
          isBusy={isBusy}
          onActionClick={onOpenRuleModal}
        />
      </div>
    </div>
  );
}
