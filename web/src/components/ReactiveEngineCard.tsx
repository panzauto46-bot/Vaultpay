"use client";

import React from "react";
import SwirledOrbCanvas from "./SwirledOrbCanvas";

interface ReactiveEngineCardProps {
  engineText: string;
  isBusy: boolean;
  onActionClick: () => void;
}

export default function ReactiveEngineCard({
  engineText,
  isBusy,
  onActionClick,
}: ReactiveEngineCardProps) {
  return (
    <div
      onClick={onActionClick}
      className="mt-4 rounded-[15px] h-[212px] relative overflow-hidden border border-[#2563EB]/25 flex flex-col items-center justify-between cursor-pointer group"
      style={{
        background:
          "radial-gradient(115% 95% at 50% 100%, #102A71 0%, #0A1538 50%, #090E1E 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 22px 28px, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 86px 58px, rgba(147,197,253,0.6), transparent), radial-gradient(1.2px 1.2px at 270px 38px, rgba(255,255,255,0.65), transparent), radial-gradient(1px 1px at 320px 85px, rgba(147,197,253,0.5), transparent), radial-gradient(1px 1px at 54px 130px, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 300px 145px, rgba(255,255,255,0.45), transparent)",
        }}
      />

      <div className="pt-4 text-center relative z-10 px-3">
        <div className="text-[14px] font-semibold text-[#60A5FA] tracking-wide">
          Reactive Omni Engine (~1s)
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-[12px] text-white/90">
          <svg
            className="w-3.5 h-3.5 animate-spin text-white shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="2.4"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="white"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="truncate max-w-[330px]">{engineText}</span>
        </div>
      </div>

      <div className="relative z-10 -mb-4 flex items-end justify-center">
        <SwirledOrbCanvas isPulseActive={isBusy} />
      </div>
    </div>
  );
}
