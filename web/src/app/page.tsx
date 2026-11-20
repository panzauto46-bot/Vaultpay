"use client";

import React, { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
import Navbar from "@/components/Navbar";
import OverviewChartCard from "@/components/OverviewChartCard";
import SmartPocketsCard from "@/components/SmartPocketsCard";
import TotalBalanceCard from "@/components/TotalBalanceCard";
import RuleAndPanicCard from "@/components/RuleAndPanicCard";
import LiveProofTable from "@/components/LiveProofTable";
import { DEFAULT_CONTRACT_ADDRESSES, NETWORKS } from "@/lib/contracts";
import {
  configureRulesOnChain,
  connectMetaMaskWallet,
  deployVaultPayCoreOnBase,
  deployVaultPayReactiveOnOmni,
  depositSalaryOnChain,
  fetchLiveVaultState,
  formatShortAddress,
  LiveVaultState,
  OnChainEventRow,
  triggerAnomalyOnChain,
  triggerPanicButtonOnChain,
  withdrawLockedSavingsOnChain,
  withdrawSpendingOnChain,
} from "@/lib/wagmi";
import {
  ChevronDown,
  Home,
  Megaphone,
  ClipboardList,
  GraduationCap,
  CreditCard,
  Settings,
  LogOut,
  X,
  Lock,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Rocket,
  RefreshCw,
} from "lucide-react";

const AVATAR_HOSSEIN =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80";
const AVATAR_SAMUEL =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80";
const AVATAR_MARIA =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80";
const AVATAR_STEPHA =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80";
const AVATAR_5 =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80";
const AVATAR_6 =
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80";

export default function VaultPayDashboardPage() {
  const [timeframe, setTimeframe] = useState<"24h" | "Week" | "Month">("Month");
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [fullAccount, setFullAccount] = useState<`0x${string}` | null>(null);

  // Deployed Contract Addresses (persisted in localStorage or .env)
  const [coreAddress, setCoreAddress] = useState<string>(
    DEFAULT_CONTRACT_ADDRESSES.vaultPayCore
  );
  const [reactiveAddress, setReactiveAddress] = useState<string>(
    DEFAULT_CONTRACT_ADDRESSES.vaultPayReactive
  );

  // Live On-Chain Telemetry State
  const [liveState, setLiveState] = useState<LiveVaultState>({
    baseBlockNumber: BigInt(0),
    baseBlockTimestamp: BigInt(0),
    reactiveBlockNumber: BigInt(0),
    walletEthBalance: "0.0000",
    vaultTotalEth: "0.0000",
    lockedSavingsEth: "0.0000",
    spendingBalanceEth: "0.0000",
    totalBillsPaidEth: "0.0000",
    savingsUnlockTimestamp: BigInt(0),
    secondsUntilUnlock: BigInt(0),
    safeBackupWallet: "",
    billsAddress: "",
    savingsBps: 2000,
    billsBps: 1000,
    maxSafeWithdrawEth: "0.30",
    isConfigured: false,
    isFrozen: false,
    reactiveSplitsCount: 0,
    reactiveEscapesCount: 0,
  });
  const [onChainEvents, setOnChainEvents] = useState<OnChainEventRow[]>([]);

  // Rule Form Inputs for On-Chain configureRules(), depositSalary(), & withdrawals
  const [savingsPct, setSavingsPct] = useState(20);
  const [billsPct, setBillsPct] = useState(10);
  const [lockDays, setLockDays] = useState(30);
  const [maxSafeEth, setMaxSafeEth] = useState("0.30");
  const [depositEthAmount, setDepositEthAmount] = useState("0.01");
  const [withdrawEthAmount, setWithdrawEthAmount] = useState("0.005");
  const [billsWalletInput, setBillsWalletInput] = useState("");
  const [safeWalletInput, setSafeWalletInput] = useState("");
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Reactive Omni Engine Status
  const [isBusy, setIsBusy] = useState(false);
  const [engineText, setEngineText] = useState(
    "Monitoring Base Sepolia events in real-time (~1s finality)..."
  );
  const [activeAlert, setActiveAlert] = useState<{
    type: "info" | "error" | "success";
    message: string;
    txUrl?: string;
  } | null>(null);

  // Load saved contract addresses from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCore = localStorage.getItem("vaultpay_core_address");
      const savedReactive = localStorage.getItem("vaultpay_reactive_address");
      if (savedCore && isAddress(savedCore)) setCoreAddress(savedCore);
      if (savedReactive && isAddress(savedReactive))
        setReactiveAddress(savedReactive);
    }
  }, []);

  // Poll live on-chain data from Base Sepolia (84532) & Reactive Omni (5318007)
  const refreshOnChainTelemetry = useCallback(async () => {
    try {
      const { state, events } = await fetchLiveVaultState(
        fullAccount,
        coreAddress,
        reactiveAddress
      );
      setLiveState(state);
      setOnChainEvents(events);

      if (state.isConfigured) {
        setSavingsPct(Math.round(state.savingsBps / 100));
        setBillsPct(Math.round(state.billsBps / 100));
        setMaxSafeEth(state.maxSafeWithdrawEth);
        if (state.billsAddress) setBillsWalletInput(state.billsAddress);
        if (state.safeBackupWallet) setSafeWalletInput(state.safeBackupWallet);
      }
    } catch {
      // RPC transient error ignored during background poll
    }
  }, [fullAccount, coreAddress, reactiveAddress]);

  useEffect(() => {
    refreshOnChainTelemetry();
    const timer = setInterval(refreshOnChainTelemetry, 4000);
    return () => clearInterval(timer);
  }, [refreshOnChainTelemetry]);

  // Connect MetaMask Wallet
  const handleConnectWallet = async () => {
    try {
      setIsBusy(true);
      setEngineText("Connecting MetaMask to Base Sepolia (Chain ID: 84532)...");
      const res = await connectMetaMaskWallet();
      setConnectedAccount(res.shortAccount);
      setFullAccount(res.account);
      if (!billsWalletInput) setBillsWalletInput(res.account);
      if (!safeWalletInput) setSafeWalletInput(res.account);

      setActiveAlert({
        type: "success",
        message: `Connected ${res.shortAccount} on Base Sepolia (Chain ID: ${res.chainId})`,
      });
      setEngineText(
        "Wallet connected! Monitoring Base Sepolia & Reactive Omni (~1s)..."
      );
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message: err?.message || "Failed to connect MetaMask wallet.",
      });
      setEngineText("Waiting for MetaMask connection...");
    } finally {
      setIsBusy(false);
    }
  };

  const ensureReadyForWrite = async (): Promise<{
    account: `0x${string}`;
    core: `0x${string}`;
  } | null> => {
    let acc = fullAccount;
    if (!acc) {
      try {
        const res = await connectMetaMaskWallet();
        setConnectedAccount(res.shortAccount);
        setFullAccount(res.account);
        acc = res.account;
      } catch (err: any) {
        setActiveAlert({
          type: "error",
          message: err?.message || "Please connect MetaMask first.",
        });
        return null;
      }
    }

    if (!coreAddress || !isAddress(coreAddress)) {
      setIsRuleModalOpen(true);
      setActiveAlert({
        type: "info",
        message:
          "Please deploy VaultPayCore.sol to Base Sepolia (or paste your deployed address) in the configuration modal.",
      });
      return null;
    }

    return { account: acc, core: coreAddress as `0x${string}` };
  };

  // Deploy VaultPayCore.sol directly to Base Sepolia via MetaMask
  const handleDeployCore = async () => {
    try {
      let acc = fullAccount;
      if (!acc) {
        const res = await connectMetaMaskWallet();
        setConnectedAccount(res.shortAccount);
        setFullAccount(res.account);
        acc = res.account;
      }

      setIsBusy(true);
      setEngineText(
        "Deploying VaultPayCore.sol to Base Sepolia (Chain ID: 84532)..."
      );
      const { contractAddress, txHash } = await deployVaultPayCoreOnBase(acc);
      setCoreAddress(contractAddress);
      localStorage.setItem("vaultpay_core_address", contractAddress);

      setActiveAlert({
        type: "success",
        message: `VaultPayCore deployed at ${contractAddress}`,
        txUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${txHash}`,
      });
      setEngineText("VaultPayCore deployed on Base Sepolia!");
      await refreshOnChainTelemetry();
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message: err?.shortMessage || err?.message || "Core deployment failed.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  // Deploy VaultPayReactive.sol directly to Reactive Omni via MetaMask
  const handleDeployReactive = async () => {
    try {
      let acc = fullAccount;
      if (!acc) {
        const res = await connectMetaMaskWallet();
        setConnectedAccount(res.shortAccount);
        setFullAccount(res.account);
        acc = res.account;
      }
      if (!coreAddress || !isAddress(coreAddress)) {
        setActiveAlert({
          type: "error",
          message:
            "Deploy or enter VaultPayCore address on Base Sepolia before deploying VaultPayReactive.",
        });
        return;
      }

      setIsBusy(true);
      setEngineText(
        "Deploying VaultPayReactive.sol to Reactive Omni (Chain ID: 5318007)..."
      );
      const { contractAddress, txHash } = await deployVaultPayReactiveOnOmni(
        acc,
        coreAddress as `0x${string}`
      );
      setReactiveAddress(contractAddress);
      localStorage.setItem("vaultpay_reactive_address", contractAddress);

      setActiveAlert({
        type: "success",
        message: `VaultPayReactive deployed at ${contractAddress}`,
        txUrl: `${NETWORKS.REACTIVE_OMNI.explorerUrl}/tx/${txHash}`,
      });
      setEngineText("VaultPayReactive subscribed on Reactive Omni (~1s)!");
      await refreshOnChainTelemetry();
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message:
          err?.shortMessage || err?.message || "Reactive deployment failed.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  // Configure Rules On-Chain
  const handleConfigureRulesOnChain = async () => {
    const ready = await ensureReadyForWrite();
    if (!ready) return;

    const billsTarget = isAddress(billsWalletInput)
      ? (billsWalletInput as `0x${string}`)
      : ready.account;
    const safeTarget = isAddress(safeWalletInput)
      ? (safeWalletInput as `0x${string}`)
      : ready.account;

    try {
      setIsBusy(true);
      setEngineText(
        "Sending configureRules() transaction to Base Sepolia..."
      );
      const txHash = await configureRulesOnChain(ready.account, ready.core, {
        savingsBps: savingsPct * 100,
        billsBps: billsPct * 100,
        lockDurationSeconds: BigInt(lockDays * 86400),
        maxSafeWithdrawEth: maxSafeEth || "0.30",
        cooldownSeconds: BigInt(60),
        billsAddress: billsTarget,
        safeBackupWallet: safeTarget,
      });

      setIsRuleModalOpen(false);
      setActiveAlert({
        type: "success",
        message: `On-chain rules saved (${savingsPct}% Locked Savings, ${billsPct}% Bills, ${
          100 - savingsPct - billsPct
        }% Spending)`,
        txUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${txHash}`,
      });
      setEngineText(
        "Rules active on-chain! Monitoring Base Sepolia events (~1s)..."
      );
      await refreshOnChainTelemetry();
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message:
          err?.shortMessage || err?.message || "Failed to configure rules.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  // Loop 1: Deposit Salary On-Chain (Emits SalaryReceived -> Reactive Omni splits in ~1s)
  const handleDepositSalaryOnChain = async () => {
    const ready = await ensureReadyForWrite();
    if (!ready) return;

    try {
      setIsBusy(true);
      setEngineText(
        `Depositing ${depositEthAmount} ETH salary to VaultPayCore on Base Sepolia...`
      );
      const txHash = await depositSalaryOnChain(
        ready.account,
        ready.core,
        depositEthAmount
      );

      setActiveAlert({
        type: "success",
        message: `Salary deposited (${depositEthAmount} ETH)! Reactive Omni is dispatching executeSalarySplit() (~1s)...`,
        txUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${txHash}`,
      });
      setEngineText(
        "SalaryReceived emitted! Reactive Omni callback executing (~1s)..."
      );
      await refreshOnChainTelemetry();
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message:
          err?.shortMessage || err?.message || "Salary deposit rejected.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  // Withdraw Spending Balance On-Chain
  const handleWithdrawSpendingOnChain = async () => {
    const ready = await ensureReadyForWrite();
    if (!ready) return;

    try {
      setIsBusy(true);
      setEngineText(
        `Withdrawing ${withdrawEthAmount} ETH from Spending Vault on Base Sepolia...`
      );
      const txHash = await withdrawSpendingOnChain(
        ready.account,
        ready.core,
        withdrawEthAmount
      );

      setActiveAlert({
        type: "success",
        message: `withdrawSpending(${withdrawEthAmount} ETH) confirmed on Base Sepolia!`,
        txUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${txHash}`,
      });
      setEngineText("Spending withdrawal confirmed on Base Sepolia!");
      await refreshOnChainTelemetry();
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message:
          err?.shortMessage || err?.message || "Spending withdrawal failed.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  // Withdraw Locked Savings On-Chain (If before block.timestamp expiry, triggers SuspiciousActivityDetected -> Auto-Escape!)
  const handleWithdrawSavingsOnChain = async () => {
    const ready = await ensureReadyForWrite();
    if (!ready) return;

    try {
      setIsBusy(true);
      setEngineText(
        `Requesting withdrawLockedSavings(${withdrawEthAmount} ETH) on Base Sepolia...`
      );
      const txHash = await withdrawLockedSavingsOnChain(
        ready.account,
        ready.core,
        withdrawEthAmount
      );

      setActiveAlert({
        type: "success",
        message: `withdrawLockedSavings(${withdrawEthAmount} ETH) executed on Base Sepolia!`,
        txUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${txHash}`,
      });
      setEngineText("Locked savings transaction confirmed on Base Sepolia!");
      await refreshOnChainTelemetry();
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message:
          err?.shortMessage ||
          err?.message ||
          "Locked savings withdrawal failed.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  // Loop 2: Trigger Anomaly Event On-Chain (Emits SuspiciousActivityDetected -> Auto-Escape in ~1s)
  const handleTriggerAnomalyOnChain = async () => {
    const ready = await ensureReadyForWrite();
    if (!ready) return;

    try {
      setIsBusy(true);
      setEngineText(
        "Broadcasting SuspiciousActivityDetected on Base Sepolia..."
      );
      const txHash = await triggerAnomalyOnChain(
        ready.account,
        ready.core,
        "0.8"
      );

      setActiveAlert({
        type: "success",
        message:
          "SuspiciousActivityDetected emitted! Reactive Omni is dispatching executeAutoEscape() to Safe Backup Wallet (~1s)...",
        txUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${txHash}`,
      });
      setEngineText(
        "Anomaly detected! Reactive Omni Auto-Escape callback in progress (~1s)..."
      );
      await refreshOnChainTelemetry();
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message:
          err?.shortMessage || err?.message || "Anomaly trigger rejected.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  // Loop 3: 1-Click Emergency Panic Button On-Chain (Emits PanicButtonPressed -> Auto-Escape in ~1s)
  const handlePanicButtonOnChain = async () => {
    const ready = await ensureReadyForWrite();
    if (!ready) return;

    try {
      setIsBusy(true);
      setEngineText(
        "Broadcasting PanicButtonPressed on Base Sepolia for emergency evacuation..."
      );
      const txHash = await triggerPanicButtonOnChain(ready.account, ready.core);

      setActiveAlert({
        type: "success",
        message:
          "1-Click Panic Button confirmed! Reactive Omni is evacuating 100% of funds to Safe Backup Wallet (~1s)...",
        txUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${txHash}`,
      });
      setEngineText(
        "PanicButtonPressed confirmed! Evacuating 100% of vault to Safe Backup Wallet..."
      );
      await refreshOnChainTelemetry();
    } catch (err: any) {
      setActiveAlert({
        type: "error",
        message:
          err?.shortMessage || err?.message || "Panic transaction rejected.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const spendPct = 100 - savingsPct - billsPct;

  return (
    <div className="min-h-screen w-full bg-[#0B0C0F] text-white flex flex-col select-none relative">
      {/* ==================== TOP NAVIGATION BAR ==================== */}
      <Navbar
        connectedAccount={connectedAccount}
        walletEthBalance={liveState.walletEthBalance}
        baseBlockTimestamp={liveState.baseBlockTimestamp}
        reactiveBlockNumber={liveState.reactiveBlockNumber}
        onConnectWallet={handleConnectWallet}
        onOpenModal={() => setIsRuleModalOpen(true)}
        avatarUrl={AVATAR_HOSSEIN}
      />

      {/* Live On-Chain Transaction Status Banner */}
      {activeAlert && (
        <div
          className={`px-7 py-2 border-b flex items-center justify-between text-[12px] transition-all ${
            activeAlert.type === "error"
              ? "bg-gradient-to-r from-[#7F1D1D]/95 via-[#DC2626]/95 to-[#991B1B]/95 border-red-400/40"
              : "bg-gradient-to-r from-[#1E3A8A]/95 via-[#2563EB]/95 to-[#1E3A8A]/95 border-[#60A5FA]/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
            <span className="font-semibold text-white">
              {activeAlert.type === "error"
                ? "Transaction Alert:"
                : "On-Chain Execution:"}
            </span>
            <span className="text-white/95">{activeAlert.message}</span>
            {activeAlert.txUrl && (
              <a
                href={activeAlert.txUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline font-semibold text-white ml-2"
              >
                <span>View Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="text-white/80 hover:text-white text-[11px] underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ==================== BODY: SIDEBAR + 2 MAIN COLUMNS ==================== */}
      <div className="flex flex-1">
        {/* ---------- LEFT ICON SIDEBAR ---------- */}
        <aside className="w-[62px] border-r border-white/[0.07] py-6 flex flex-col items-center justify-between shrink-0">
          <div className="flex flex-col items-center gap-4">
            <button className="w-[36px] h-[36px] rounded-[11px] bg-[#1C1F2A] border border-white/[0.08] flex items-center justify-center text-white shadow-sm transition-transform active:scale-[0.96]">
              <Home className="w-[16px] h-[16px] stroke-[1.8]" />
            </button>
            <button
              onClick={handleDepositSalaryOnChain}
              title="Deposit Salary On-Chain"
              className="w-[36px] h-[36px] rounded-[11px] hover:bg-white/[0.04] flex items-center justify-center text-[#6E7381] hover:text-white transition-colors"
            >
              <Megaphone className="w-[16px] h-[16px] stroke-[1.7]" />
            </button>
            <button
              onClick={handleTriggerAnomalyOnChain}
              title="Trigger Anomaly Event On-Chain"
              className="w-[36px] h-[36px] rounded-[11px] hover:bg-white/[0.04] flex items-center justify-center text-[#6E7381] hover:text-white transition-colors"
            >
              <ClipboardList className="w-[16px] h-[16px] stroke-[1.7]" />
            </button>
            <button
              onClick={() => setIsRuleModalOpen(true)}
              title="Deploy & Configure Smart Contracts"
              className="w-[36px] h-[36px] rounded-[11px] hover:bg-white/[0.04] flex items-center justify-center text-[#6E7381] hover:text-white transition-colors"
            >
              <GraduationCap className="w-[16px] h-[16px] stroke-[1.7]" />
            </button>
            <button
              onClick={handleConnectWallet}
              title="Connect MetaMask"
              className="w-[36px] h-[36px] rounded-[11px] hover:bg-white/[0.04] flex items-center justify-center text-[#6E7381] hover:text-white transition-colors"
            >
              <CreditCard className="w-[16px] h-[16px] stroke-[1.7]" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setIsRuleModalOpen(true)}
              title="Configure On-Chain Rules"
              className="w-[36px] h-[36px] rounded-[11px] hover:bg-white/[0.04] flex items-center justify-center text-[#6E7381] hover:text-white transition-colors"
            >
              <Settings className="w-[16px] h-[16px] stroke-[1.7]" />
            </button>
            <button
              onClick={refreshOnChainTelemetry}
              title="Refresh On-Chain State"
              className="w-[36px] h-[36px] rounded-[11px] hover:bg-white/[0.04] flex items-center justify-center text-[#6E7381] hover:text-white transition-colors"
            >
              <LogOut className="w-[16px] h-[16px] stroke-[1.7]" />
            </button>
          </div>
        </aside>

        {/* ---------- MAIN CONTENT GRID ---------- */}
        <main className="flex-1 grid grid-cols-12">
          {/* ==================== LEFT COLUMN (CARD 1: OVERVIEW & CARD 2: SMART POCKETS) ==================== */}
          <section className="col-span-12 lg:col-span-5 xl:col-span-4 border-r border-white/[0.07] p-5 flex flex-col justify-between gap-4">
            {/* Top Section Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-[20px] font-semibold tracking-tight text-white leading-snug">
                  Salary Auto-Splitter
                </h1>
                <p className="text-[12px] text-[#6E7381] mt-0.5">
                  {savingsPct}% Locked, {billsPct}% Bills,{" "}
                  <span className="text-white/85 font-medium">
                    {spendPct}% Spending
                  </span>
                </p>
              </div>

              <button
                onClick={() => setIsRuleModalOpen(true)}
                className="h-[34px] px-3.5 rounded-full bg-[#171922] border border-white/[0.08] flex items-center gap-2 text-[12px] font-medium text-white/90 hover:border-white/20 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Finance</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>

            {/* CARD 1: OVERVIEW LINE CHART CARD */}
            <OverviewChartCard
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              savingsPct={savingsPct}
              isConfigured={liveState.isConfigured}
              baseBlockNumber={liveState.baseBlockNumber}
              lockedSavingsEth={liveState.lockedSavingsEth}
            />

            {/* CARD 2: SMART POCKETS (LOCKED SAVINGS & DAILY SPENDING) */}
            <SmartPocketsCard
              lockedSavingsEth={liveState.lockedSavingsEth}
              spendingBalanceEth={liveState.spendingBalanceEth}
              savingsPct={savingsPct}
              spendingPct={spendPct}
              secondsUntilUnlock={liveState.secondsUntilUnlock}
              onDepositClick={handleDepositSalaryOnChain}
              onWithdrawSavingsClick={handleWithdrawSavingsOnChain}
              onWithdrawSpendingClick={handleWithdrawSpendingOnChain}
              avatarsLeft={[AVATAR_SAMUEL, AVATAR_MARIA, AVATAR_HOSSEIN]}
              avatarsRight={[AVATAR_STEPHA, AVATAR_5, AVATAR_6]}
            />
          </section>

          {/* ==================== RIGHT MAIN AREA (TOTAL BALANCE + SHIELD/PANIC + TABLE) ==================== */}
          <section className="col-span-12 lg:col-span-7 xl:col-span-8 p-5 flex flex-col justify-between gap-4">
            {/* TOP ROW: TOTAL BALANCE COLUMN (7 cols) + RULE/PANIC CARD (5 cols) */}
            <div className="grid grid-cols-12 gap-5">
              {/* ---------- CENTER COLUMN: TOTAL BALANCE + 3D BLUE ORB ---------- */}
              <TotalBalanceCard
                vaultTotalEth={liveState.vaultTotalEth}
                totalBillsPaidEth={liveState.totalBillsPaidEth}
                maxSafeEth={maxSafeEth}
                billsPct={billsPct}
                engineText={engineText}
                isBusy={isBusy}
                onDepositSalary={handleDepositSalaryOnChain}
                onOpenRuleModal={() => setIsRuleModalOpen(true)}
              />

              {/* ---------- RIGHT COLUMN: CARD 5 (VAULT SHIELD & 1-CLICK PANIC) ---------- */}
              <RuleAndPanicCard
                savingsPct={savingsPct}
                billsPct={billsPct}
                safeWalletAddr={
                  liveState.safeBackupWallet
                    ? formatShortAddress(liveState.safeBackupWallet)
                    : safeWalletInput
                    ? formatShortAddress(safeWalletInput)
                    : "Not set"
                }
                onOpenRuleModal={() => setIsRuleModalOpen(true)}
                onTriggerAnomaly={handleTriggerAnomalyOnChain}
                onDepositSalary={handleDepositSalaryOnChain}
                onPanicButton={handlePanicButtonOnChain}
              />
            </div>

            {/* ==================== BOTTOM WIDE CARD: LIVE ON-CHAIN REACTIVE EVENT LOGS ==================== */}
            <LiveProofTable
              events={onChainEvents}
              nodeAvatars={[AVATAR_SAMUEL, AVATAR_MARIA, AVATAR_5]}
              coreAddress={coreAddress}
              onRefresh={refreshOnChainTelemetry}
              onOpenModal={() => setIsRuleModalOpen(true)}
            />
          </section>
        </main>
      </div>

      {/* ==================== ON-CHAIN DEPLOYMENT & RULE CONFIGURATION MODAL ==================== */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[620px] rounded-[24px] bg-[#12141B] border border-white/15 p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-[17px] font-semibold text-white">
                  On-Chain Contracts &amp; Set-and-Forget Rules
                </h3>
                <p className="text-[12px] text-[#6E7381] mt-0.5">
                  Deploy or connect `VaultPayCore.sol` (Base Sepolia 84532)
                  &amp; `VaultPayReactive.sol` (Reactive Omni 5318007)
                </p>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1C1F2A] flex items-center justify-center text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[12.5px]">
              {/* Contract Deployment & Address Section */}
              <div className="rounded-[14px] bg-[#181B24] border border-white/[0.07] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    1. Deployed Contract Addresses
                  </span>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://www.alchemy.com/faucets/base-sepolia"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#8E95A5] hover:text-white"
                    >
                      <span>Base Faucet</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href="https://lasna.reactscan.net"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#8E95A5] hover:text-white"
                    >
                      <span>Omni Explorer</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <button
                      onClick={() => {
                        const tx1 = onChainEvents[0]?.txHash || "0xORIGIN_TX_1";
                        const tx2 = onChainEvents[1]?.txHash || "0xCALLBACK_TX_1";
                        const md = `| Contract | Network | Chain ID | Address |\n| :--- | :--- | :--- | :--- |\n| **\`VaultPayCore.sol\`** | Base Sepolia | \`84532\` | \`${coreAddress || "0xYOUR_BASE_SEPOLIA_ADDRESS"}\` |\n| **\`VaultPayReactive.sol\`** | Reactive Omni (Lasna) | \`5318007\` | \`${reactiveAddress || "0xYOUR_REACTIVE_OMNI_ADDRESS"}\` |\n\n- Latest Tx 1: \`${tx1}\`\n- Latest Tx 2: \`${tx2}\``;
                        navigator.clipboard.writeText(md);
                        setActiveAlert({
                          type: "success",
                          message: "Copied DoraHacks README Proof Markdown to clipboard!",
                        });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#10B981] hover:underline font-medium"
                    >
                      <span>Copy README Proof</span>
                    </button>
                    <button
                      onClick={refreshOnChainTelemetry}
                      className="inline-flex items-center gap-1 text-[11px] text-[#60A5FA] hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync RPC</span>
                    </button>
                  </div>
                </div>

                {/* Base Sepolia Core Contract */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#8E95A5] mb-1">
                    <span>
                      VaultPayCore.sol (Base Sepolia Chain ID:{" "}
                      {NETWORKS.BASE_SEPOLIA.chainId})
                    </span>
                    <button
                      onClick={handleDeployCore}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[10.5px] transition-transform active:scale-[0.96]"
                    >
                      <Rocket className="w-2.5 h-2.5" />
                      <span>Deploy to Base Sepolia</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="0x... (Deploy with button above or paste address)"
                    value={coreAddress}
                    onChange={(e) => {
                      setCoreAddress(e.target.value);
                      if (isAddress(e.target.value)) {
                        localStorage.setItem(
                          "vaultpay_core_address",
                          e.target.value
                        );
                      }
                    }}
                    className="w-full bg-[#12141B] border border-white/10 rounded-lg px-3 py-1.5 text-[12px] font-mono text-white"
                  />
                </div>

                {/* Reactive Omni Brain Contract */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#8E95A5] mb-1">
                    <span>
                      VaultPayReactive.sol (Reactive Omni Chain ID:{" "}
                      {NETWORKS.REACTIVE_OMNI.chainId})
                    </span>
                    <button
                      onClick={handleDeployReactive}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1E293B] hover:bg-[#334155] border border-[#3B82F6]/40 text-[#60A5FA] font-semibold text-[10.5px] transition-transform active:scale-[0.96]"
                    >
                      <Rocket className="w-2.5 h-2.5" />
                      <span>Deploy to Reactive Omni</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="0x... (Deploy with button above or paste address)"
                    value={reactiveAddress}
                    onChange={(e) => {
                      setReactiveAddress(e.target.value);
                      if (isAddress(e.target.value)) {
                        localStorage.setItem(
                          "vaultpay_reactive_address",
                          e.target.value
                        );
                      }
                    }}
                    className="w-full bg-[#12141B] border border-white/10 rounded-lg px-3 py-1.5 text-[12px] font-mono text-white"
                  />
                </div>
              </div>

              {/* Slider 1: Time-Locked Savings */}
              <div className="rounded-[14px] bg-[#181B24] border border-white/[0.07] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
                    2. Time-Locked Savings (via block.timestamp)
                  </span>
                  <span className="font-bold text-[#60A5FA] tabular-nums">
                    {savingsPct}% ({lockDays} Days)
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={5}
                    value={savingsPct}
                    onChange={(e) => setSavingsPct(Number(e.target.value))}
                    className="flex-1 accent-[#2563EB]"
                  />
                  <select
                    value={lockDays}
                    onChange={(e) => setLockDays(Number(e.target.value))}
                    className="bg-[#12141B] border border-white/10 rounded-lg px-2.5 py-1 text-[11.5px] text-white"
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Bills Address & Safe Backup Wallet */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[14px] bg-[#181B24] border border-white/[0.07] p-3.5">
                  <div className="text-[#8E95A5] text-[11.5px]">
                    3. Auto-Pay Bills Recipient ({billsPct}%)
                  </div>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={billsWalletInput}
                    onChange={(e) => setBillsWalletInput(e.target.value)}
                    className="mt-1.5 w-full bg-[#12141B] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11.5px] font-mono text-white"
                  />
                </div>
                <div className="rounded-[14px] bg-[#181B24] border border-white/[0.07] p-3.5">
                  <div className="text-[#8E95A5] text-[11.5px]">
                    4. Safe Backup Wallet (~1s Escape)
                  </div>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={safeWalletInput}
                    onChange={(e) => setSafeWalletInput(e.target.value)}
                    className="mt-1.5 w-full bg-[#12141B] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11.5px] font-mono text-white"
                  />
                </div>
              </div>

              {/* Row 3: Max Safe Withdraw, Salary Deposit, & Withdraw Amount */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-[14px] bg-[#181B24] border border-white/[0.07] p-3 flex flex-col justify-between">
                  <span className="text-[#8E95A5] text-[11px]">
                    Max Safe Withdraw
                  </span>
                  <div className="mt-1.5 flex items-center gap-1">
                    <input
                      type="text"
                      value={maxSafeEth}
                      onChange={(e) => setMaxSafeEth(e.target.value)}
                      className="w-full bg-[#12141B] border border-white/10 rounded-lg px-2 py-1 text-right font-mono text-white text-[12px]"
                    />
                    <span className="text-white/70 text-[11px]">ETH</span>
                  </div>
                </div>

                <div className="rounded-[14px] bg-[#181B24] border border-white/[0.07] p-3 flex flex-col justify-between">
                  <span className="text-[#8E95A5] text-[11px]">
                    Salary Deposit
                  </span>
                  <div className="mt-1.5 flex items-center gap-1">
                    <input
                      type="text"
                      value={depositEthAmount}
                      onChange={(e) => setDepositEthAmount(e.target.value)}
                      className="w-full bg-[#12141B] border border-white/10 rounded-lg px-2 py-1 text-right font-mono text-white text-[12px]"
                    />
                    <span className="text-white/70 text-[11px]">ETH</span>
                  </div>
                </div>

                <div className="rounded-[14px] bg-[#181B24] border border-white/[0.07] p-3 flex flex-col justify-between">
                  <span className="text-[#8E95A5] text-[11px]">
                    Withdraw Amount
                  </span>
                  <div className="mt-1.5 flex items-center gap-1">
                    <input
                      type="text"
                      value={withdrawEthAmount}
                      onChange={(e) => setWithdrawEthAmount(e.target.value)}
                      className="w-full bg-[#12141B] border border-white/10 rounded-lg px-2 py-1 text-right font-mono text-white text-[12px]"
                    />
                    <span className="text-white/70 text-[11px]">ETH</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsRuleModalOpen(false);
                    handlePanicButtonOnChain();
                  }}
                  disabled={isBusy}
                  className="px-3.5 py-2 rounded-full bg-[#DC2626]/20 border border-[#EF4444]/40 text-[#F87171] hover:bg-[#DC2626] hover:text-white text-[11.5px] font-semibold flex items-center gap-1.5 transition-all"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>1-Click Panic</span>
                </button>
                <button
                  onClick={() => {
                    setIsRuleModalOpen(false);
                    handleWithdrawSpendingOnChain();
                  }}
                  disabled={isBusy}
                  className="px-3.5 py-2 rounded-full bg-[#1C1F2A] border border-white/15 text-white/90 hover:text-white text-[11.5px] font-medium transition-transform active:scale-[0.96]"
                >
                  Withdraw Spending
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsRuleModalOpen(false);
                    handleDepositSalaryOnChain();
                  }}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-full bg-white text-[#0B0C0F] text-[12px] font-semibold shadow hover:bg-white/90 transition-transform active:scale-[0.96]"
                >
                  Deposit {depositEthAmount} ETH
                </button>
                <button
                  onClick={handleConfigureRulesOnChain}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold shadow-[0_0_20px_rgba(37,99,235,0.45)] flex items-center gap-1.5 transition-transform active:scale-[0.96]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Rules On-Chain</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
