"use client";

import React from "react";
import { ChevronDown, Command, ExternalLink, Lock } from "lucide-react";
import { OnChainEventRow } from "@/lib/wagmi";
import { formatShortAddress } from "@/lib/wagmi";

interface LiveProofTableProps {
  events: OnChainEventRow[];
  nodeAvatars: string[];
  coreAddress: string;
  onRefresh: () => void;
  onOpenModal: () => void;
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
          alt="Node"
          className="w-[22px] h-[22px] rounded-full object-cover ring-[1.5px] ring-[#14161D] outline outline-1 outline-white/10"
        />
      ))}
      <div className="w-[22px] h-[22px] rounded-full bg-[#252834] ring-[1.5px] ring-[#14161D] flex items-center justify-center text-[9px] font-semibold text-white/85 tabular-nums">
        {label}
      </div>
    </div>
  );
}

export default function LiveProofTable({
  events,
  nodeAvatars,
  coreAddress,
  onRefresh,
  onOpenModal,
}: LiveProofTableProps) {
  return (
    <div className="rounded-[22px] bg-[#12141B] border border-white/[0.07] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      {/* Table Header Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-white">
          Live On-Chain Reactive Event Logs (Base Sepolia &lt;-&gt; Omni)
        </h2>

        <button
          onClick={onRefresh}
          className="h-[34px] pl-2 pr-3.5 rounded-full bg-[#171922] border border-white/[0.08] flex items-center gap-2 text-[12px] font-medium text-white/90 hover:border-white/20 transition-colors"
        >
          <span className="px-1.5 py-0.5 rounded-full bg-[#242836] text-[10px] text-white/80 flex items-center gap-0.5">
            <Command className="w-2.5 h-2.5" />2
          </span>
          <span>Refresh Logs</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 ml-0.5" />
        </button>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11.5px] text-[#6E7381] font-normal">
              <th className="pb-2.5 font-normal w-[50px]">Rank</th>
              <th className="pb-2.5 font-normal">Event</th>
              <th className="pb-2.5 font-normal">User</th>
              <th className="pb-2.5 font-normal">Tx Hash</th>
              <th className="pb-2.5 font-normal">Payload / Action</th>
              <th className="pb-2.5 font-normal">Finality</th>
              <th className="pb-2.5 font-normal text-center">Status</th>
              <th className="pb-2.5 font-normal text-right">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-[12.5px]">
            {events.length > 0 ? (
              events.map((row, idx) => (
                <tr
                  key={row.id}
                  className="group hover:bg-white/[0.015] transition-colors"
                >
                  <td className="py-2.5 text-[#8E95A5] tabular-nums">
                    {row.rank}
                  </td>
                  <td className="py-2.5 font-medium text-white whitespace-nowrap">
                    {row.eventTitle}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <img
                        src={nodeAvatars[idx % nodeAvatars.length]}
                        alt={row.originUser}
                        className="w-[23px] h-[23px] rounded-full object-cover outline outline-1 outline-white/10"
                      />
                      <span className="text-white/90 font-mono text-[12px]">
                        {row.originUser}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-[#60A5FA] font-mono text-[12px] tabular-nums whitespace-nowrap">
                    {formatShortAddress(row.txHash)}
                  </td>
                  <td className="py-2.5 text-white/90 whitespace-nowrap">
                    {row.callbackLabel}
                  </td>
                  <td className="py-2.5">
                    <AvatarStack avatars={nodeAvatars} label="~1s" />
                  </td>
                  <td className="py-2.5 text-center">
                    {row.status === "Locked" ? (
                      <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-[#191C25] text-[11px] text-[#8E95A5] font-medium">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-[#1C1F29] text-[11px] text-[#9CA3AF] font-medium">
                        {row.status}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <a
                      href={row.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3.5 py-1 rounded-full bg-white text-[#0B0C0F] text-[11.5px] font-semibold shadow-sm hover:bg-white/90 transition-transform active:scale-[0.96]"
                    >
                      <span>{row.explorerName || "BaseScan"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-7 text-center text-[#8E95A5]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-[13px] text-white/90 font-medium">
                      {coreAddress
                        ? "No on-chain transactions found yet for this VaultPayCore contract on Base Sepolia."
                        : "Connect MetaMask & deploy or enter your VaultPayCore contract address on Base Sepolia."}
                    </span>
                    <button
                      onClick={onOpenModal}
                      className="mt-1 px-4 py-1.5 rounded-full bg-white text-[#0B0C0F] text-[12px] font-semibold shadow hover:bg-white/90 transition-transform active:scale-[0.96]"
                    >
                      {coreAddress
                        ? "Execute On-Chain Transaction"
                        : "Deploy / Configure Contracts"}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
