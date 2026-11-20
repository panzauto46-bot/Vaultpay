"use client";

import React from "react";
import { Info } from "lucide-react";

interface OverviewChartCardProps {
  timeframe: "24h" | "Week" | "Month";
  onTimeframeChange: (tf: "24h" | "Week" | "Month") => void;
  savingsPct: number;
  isConfigured: boolean;
  baseBlockNumber: bigint;
  lockedSavingsEth: string;
}

export default function OverviewChartCard({
  timeframe,
  onTimeframeChange,
  savingsPct,
  isConfigured,
  baseBlockNumber,
  lockedSavingsEth,
}: OverviewChartCardProps) {
  return (
    <div className="rounded-[22px] bg-[#12141B] border border-white/[0.07] p-5 relative overflow-hidden flex-1 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      {/* Ambient Electric Blue Bottom-Left Radial Glow */}
      <div
        className="pointer-events-none absolute -bottom-12 left-6 w-[250px] h-[155px] rounded-full blur-[52px]"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.34) 0%, rgba(18,20,27,0) 75%)",
        }}
      />

      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-white">Overview</h2>
          <button className="text-white/50 hover:text-white transition-colors">
            <Info className="w-4 h-4 stroke-[1.7]" />
          </button>
        </div>

        {/* Two Summary Rows */}
        <div className="mt-3.5 space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#6E7381]">Rule status</span>
            <span className="text-white/95 font-medium">
              {isConfigured
                ? "Set It & Forget It — ACTIVE"
                : "Awaiting On-Chain Rule Setup"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6E7381]">Time-locked allocation</span>
            <span className="font-semibold tabular-nums">
              <span className="text-[#3B82F6]">+ </span>
              <span className="text-white">{savingsPct}.00</span>
              <span className="text-[#6E7381]"> %</span>
            </span>
          </div>
        </div>

        {/* Segmented Timeframe Pill Switcher (24h | Week | Month) */}
        <div className="mt-3.5 p-1 rounded-full bg-[#171A23] border border-white/[0.05] grid grid-cols-3 text-[12px]">
          {(["24h", "Week", "Month"] as const).map((tab) => {
            const active = timeframe === tab;
            return (
              <button
                key={tab}
                onClick={() => onTimeframeChange(tab)}
                className={`py-1.5 rounded-full font-medium transition-all ${
                  active
                    ? "bg-[#242836] text-white border border-white/[0.09] shadow-sm"
                    : "text-[#6E7381] hover:text-white/80"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wavy Spline Blue Line Chart with Vertical Dashed Lines & Tooltip */}
      <div className="relative h-[155px] mt-3 w-full">
        <svg
          viewBox="0 0 340 130"
          className="w-full h-[126px] overflow-visible"
        >
          <defs>
            <linearGradient
              id="chartAreaGrad"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.32" />
              <stop offset="85%" stopColor="#2563EB" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
            <filter
              id="blueGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {[28, 122, 218, 312].map((xPos, idx) => (
            <line
              key={idx}
              x1={xPos}
              y1="6"
              x2={xPos}
              y2="118"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}

          <path
            d="M 8 100 C 22 98, 32 74, 48 76 C 64 78, 72 86, 88 77 C 104 68, 114 42, 130 44 C 146 46, 155 74, 172 60 C 185 50, 192 46, 204 52 C 214 57, 222 20, 232 20 C 242 20, 250 74, 265 68 C 278 62, 286 46, 298 52 C 310 57, 320 35, 334 28 L 334 120 L 8 120 Z"
            fill="url(#chartAreaGrad)"
          />

          <path
            d="M 8 100 C 22 98, 32 74, 48 76 C 64 78, 72 86, 88 77 C 104 68, 114 42, 130 44 C 146 46, 155 74, 172 60 C 185 50, 192 46, 204 52 C 214 57, 222 20, 232 20 C 242 20, 250 74, 265 68 C 278 62, 286 46, 298 52 C 310 57, 320 35, 334 28"
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.3"
            strokeLinecap="round"
            filter="url(#blueGlow)"
          />

          <line
            x1="232"
            y1="20"
            x2="232"
            y2="52"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.2"
            strokeDasharray="2.5 2.5"
          />
          <circle
            cx="232"
            cy="20"
            r="4.5"
            fill="#0B0C0F"
            stroke="#FFFFFF"
            strokeWidth="2.4"
          />
        </svg>

        {/* Floating Glass Tooltip Box */}
        <div className="absolute top-[46px] left-[68.2%] -translate-x-1/2 rounded-[13px] bg-[#1C2232]/90 backdrop-blur-md border border-white/[0.11] px-3 py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.65)] min-w-[106px]">
          <div className="text-[10.5px] text-[#8E95A5]">Locked Vault</div>
          <div className="text-[12px] font-semibold text-white mt-0.5 tabular-nums">
            {lockedSavingsEth} ETH
          </div>
          <div className="text-[11px] font-semibold mt-0.5 tabular-nums">
            <span className="text-[#3B82F6]">+ </span>
            <span className="text-white">{savingsPct}.0</span>
            <span className="text-[#6E7381]"> %</span>
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="flex items-center justify-between px-2 text-[11px] text-[#6E7381] mt-1 tabular-nums">
          <span>Epoch 1</span>
          <span>Epoch 2</span>
          <span>Epoch 3</span>
          <span>Live</span>
        </div>
      </div>

      {/* Card Bottom Metric Footer */}
      <div className="mt-2 pt-1 flex items-end justify-between relative z-10">
        <div className="flex items-baseline tabular-nums">
          <span className="text-[#3B82F6] text-[23px] font-normal mr-1">
            +
          </span>
          <span className="text-[30px] leading-none font-semibold tracking-tight text-white">
            {savingsPct}.00
          </span>
          <span className="text-[16px] text-[#6E7381] font-normal ml-1">%</span>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-[#6E7381]">Base Sepolia Block</div>
          <div className="text-[11.5px] font-medium text-white/90 mt-0.5 tabular-nums">
            {baseBlockNumber > BigInt(0)
              ? `#${baseBlockNumber.toString()}`
              : "Connecting RPC..."}
          </div>
        </div>
      </div>
    </div>
  );
}
