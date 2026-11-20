"use client";

import React from "react";
import { ArrowRight, ShieldAlert, Zap } from "lucide-react";

interface RuleAndPanicCardProps {
  savingsPct: number;
  billsPct: number;
  safeWalletAddr: string;
  onOpenRuleModal: () => void;
  onTriggerAnomaly: () => void;
  onDepositSalary: () => void;
  onPanicButton: () => void;
}

export default function RuleAndPanicCard({
  savingsPct,
  billsPct,
  safeWalletAddr,
  onOpenRuleModal,
  onTriggerAnomaly,
  onDepositSalary,
  onPanicButton,
}: RuleAndPanicCardProps) {
  const spendPct = 100 - savingsPct - billsPct;

  return (
    <div className="col-span-12 md:col-span-5 flex">
      <div className="w-full rounded-[22px] bg-[#12141B] border border-white/[0.07] p-5 relative overflow-hidden flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        {/* Warm Golden Ambient Radial Glow on Middle-Right Edge */}
        <div
          className="pointer-events-none absolute top-[28%] -right-12 w-[185px] h-[185px] rounded-full blur-[50px]"
          style={{
            background:
              "radial-gradient(circle, rgba(234,179,8,0.26) 0%, rgba(234,179,8,0.06) 55%, transparent 80%)",
          }}
        />

        <div className="relative z-10">
          {/* 1. Header Row */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[13.5px] font-medium text-white">
                Vault Shield &amp; Rules
              </div>
              <div className="text-[11px] text-[#6E7381] mt-0.5">
                Powered by{" "}
                <span className="text-white/80 font-medium">Reactive Omni</span>
              </div>
            </div>

            <button
              onClick={onOpenRuleModal}
              className="flex items-center gap-1 text-[12px] font-medium text-white/90 hover:text-white transition-opacity"
            >
              <span>Configure</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Translucent Slate Banner Pill */}
          <div
            onClick={onOpenRuleModal}
            className="mt-4 w-full py-2.5 px-3 rounded-[12px] bg-gradient-to-b from-[#2A2D3A] to-[#20232E] border border-white/[0.08] text-center text-[12px] font-medium text-white/95 shadow-inner cursor-pointer whitespace-nowrap"
          >
            {savingsPct}% Savings · {billsPct}% Bills · {spendPct}% Spending
          </div>

          {/* 3. Headline with Lightning Icon & Tilted Golden Badge */}
          <div className="mt-5">
            <div className="flex items-center flex-wrap gap-1.5">
              <Zap className="w-4 h-4 text-white fill-white shrink-0" />
              <span className="text-[15px] font-semibold text-white tracking-tight">
                Auto-Escape Defense
              </span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-[7px] bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#CA8A04] text-[#0B0C0F] font-extrabold text-[14px] -rotate-[8deg] shadow-[0_0_22px_rgba(234,179,8,0.5)] ml-0.5 tabular-nums">
                ~1s
              </span>
            </div>

            <p className="text-[12px] text-[#8E95A5] mt-1.5 truncate">
              Safe Backup Wallet: {safeWalletAddr || "Not set"}
            </p>
          </div>

          {/* 4. Description Paragraph */}
          <p className="mt-3.5 text-[11.5px] leading-[1.6] text-[#6E7381]">
            When an anomalous withdrawal occurs, Reactive Omni overrides the
            savings time-lock and evacuates 100% of funds to your Safe Backup
            Wallet in ~1 second.
          </p>

          {/* 5. Trigger Anomaly Event On-Chain -> */}
          <button
            onClick={onTriggerAnomaly}
            className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white hover:underline"
          >
            <span>Trigger Anomaly Event</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Action Footer: Deposit Salary | 🚨 1-Click Panic Button */}
        <div className="pt-4 flex items-center justify-between relative z-10">
          <button
            onClick={onDepositSalary}
            className="text-[12px] text-[#8E95A5] hover:text-white transition-colors"
          >
            + Deposit Salary
          </button>

          <button
            onClick={onPanicButton}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white text-[12px] font-bold shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:brightness-110 flex items-center gap-1.5 transition-transform active:scale-[0.96]"
          >
            <ShieldAlert className="w-3.5 h-3.5 stroke-[2.3]" />
            <span>1-CLICK PANIC</span>
          </button>
        </div>
      </div>
    </div>
  );
}
