/**
 * @file wagmi.ts
 * @notice 100% Real On-Chain Web3 Client powered by viem & MetaMask (EIP-1193).
 *         Connects directly to Base Sepolia (Chain ID: 84532) and
 *         Reactive Omni / Lasna Testnet (Chain ID: 5318007).
 *         Zero dummy data, zero fake transaction hashes.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatEther,
  http,
  isAddress,
  parseAbiItem,
  parseEther,
} from "viem";
import {
  NETWORKS,
  VAULTPAY_CORE_ABI,
  VAULTPAY_CORE_BYTECODE,
  VAULTPAY_REACTIVE_ABI,
  VAULTPAY_REACTIVE_BYTECODE,
} from "./contracts";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (
        event: string,
        handler: (...args: any[]) => void
      ) => void;
    };
  }
}

export const baseSepoliaChain = defineChain({
  id: NETWORKS.BASE_SEPOLIA.chainId,
  name: NETWORKS.BASE_SEPOLIA.name,
  nativeCurrency: { name: "Base Sepolia ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [NETWORKS.BASE_SEPOLIA.rpcUrl] },
  },
  blockExplorers: {
    default: {
      name: "BaseScan Sepolia",
      url: NETWORKS.BASE_SEPOLIA.explorerUrl,
    },
  },
  testnet: true,
});

export const reactiveOmniChain = defineChain({
  id: NETWORKS.REACTIVE_OMNI.chainId,
  name: NETWORKS.REACTIVE_OMNI.name,
  nativeCurrency: { name: "Reactive Lasna", symbol: "lREACT", decimals: 18 },
  rpcUrls: {
    default: { http: [NETWORKS.REACTIVE_OMNI.rpcUrl] },
  },
  blockExplorers: {
    default: {
      name: "ReactScan Lasna",
      url: NETWORKS.REACTIVE_OMNI.explorerUrl,
    },
  },
  testnet: true,
});

export const basePublicClient = createPublicClient({
  chain: baseSepoliaChain,
  transport: http(NETWORKS.BASE_SEPOLIA.rpcUrl),
});

export const reactivePublicClient = createPublicClient({
  chain: reactiveOmniChain,
  transport: http(NETWORKS.REACTIVE_OMNI.rpcUrl),
});

export function formatShortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function switchToChain(
  target: "BASE_SEPOLIA" | "REACTIVE_OMNI"
): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask extension is not installed in this browser.");
  }

  const net = NETWORKS[target];
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: net.chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: net.chainIdHex,
            chainName: net.name,
            nativeCurrency: {
              name:
                target === "BASE_SEPOLIA"
                  ? "Base Sepolia ETH"
                  : "Reactive Lasna",
              symbol: target === "BASE_SEPOLIA" ? "ETH" : "lREACT",
              decimals: 18,
            },
            rpcUrls: [net.rpcUrl],
            blockExplorerUrls: [net.explorerUrl],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

export async function connectMetaMaskWallet(): Promise<{
  account: `0x${string}`;
  shortAccount: string;
  chainId: number;
}> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install MetaMask to interact with Base Sepolia & Reactive Omni."
    );
  }

  const accounts: string[] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  if (!accounts || !accounts[0]) {
    throw new Error("No wallet account returned by MetaMask.");
  }

  await switchToChain("BASE_SEPOLIA");

  const chainHex: string = await window.ethereum.request({
    method: "eth_chainId",
  });

  const account = accounts[0] as `0x${string}`;
  return {
    account,
    shortAccount: formatShortAddress(account),
    chainId: parseInt(chainHex, 16),
  };
}

export interface LiveVaultState {
  baseBlockNumber: bigint;
  baseBlockTimestamp: bigint;
  reactiveBlockNumber: bigint;
  walletEthBalance: string;
  vaultTotalEth: string;
  lockedSavingsEth: string;
  spendingBalanceEth: string;
  totalBillsPaidEth: string;
  savingsUnlockTimestamp: bigint;
  secondsUntilUnlock: bigint;
  safeBackupWallet: string;
  billsAddress: string;
  savingsBps: number;
  billsBps: number;
  maxSafeWithdrawEth: string;
  isConfigured: boolean;
  isFrozen: boolean;
  reactiveSplitsCount: number;
  reactiveEscapesCount: number;
}

export interface OnChainEventRow {
  id: string;
  rank: string;
  eventTitle: string;
  originUser: string;
  txHash: string;
  blockTimestamp: string;
  callbackLabel: string;
  status: "Confirmed" | "Evacuated" | "Locked" | "Active";
  explorerUrl: string;
  explorerName: "BaseScan" | "ReactScan";
}

/**
 * @notice Reads live on-chain telemetry & event logs from Base Sepolia (84532) and Reactive Omni (5318007).
 */
export async function fetchLiveVaultState(
  userAddress: string | null,
  coreAddress: string,
  reactiveAddress: string
): Promise<{
  state: LiveVaultState;
  events: OnChainEventRow[];
}> {
  const [baseBlock, reactiveBlock] = await Promise.all([
    basePublicClient.getBlock().catch(() => null),
    reactivePublicClient.getBlockNumber().catch(() => BigInt(0)),
  ]);

  let walletEthBalance = "0.0000";
  if (userAddress && isAddress(userAddress)) {
    const rawBal = await basePublicClient
      .getBalance({ address: userAddress })
      .catch(() => BigInt(0));
    walletEthBalance = Number(formatEther(rawBal)).toFixed(4);
  }

  let vaultTotalEth = "0.0000";
  let lockedSavingsEth = "0.0000";
  let spendingBalanceEth = "0.0000";
  let totalBillsPaidEth = "0.0000";
  let savingsUnlockTimestamp = BigInt(0);
  let secondsUntilUnlock = BigInt(0);
  let safeBackupWallet = userAddress || "";
  let billsAddress = userAddress || "";
  let savingsBps = 2000;
  let billsBps = 1000;
  let maxSafeWithdrawEth = "0.30";
  let isConfigured = false;
  let isFrozen = false;
  let reactiveSplitsCount = 0;
  let reactiveEscapesCount = 0;

  const combined: Array<{
    sortKey: bigint;
    row: Omit<OnChainEventRow, "rank">;
  }> = [];

  if (coreAddress && isAddress(coreAddress)) {
    const code = await basePublicClient
      .getBytecode({ address: coreAddress })
      .catch(() => undefined);

    if (code && code !== "0x") {
      if (userAddress && isAddress(userAddress)) {
        const [summary, rule] = await Promise.all([
          basePublicClient
            .readContract({
              address: coreAddress,
              abi: VAULTPAY_CORE_ABI,
              functionName: "getVaultSummary",
              args: [userAddress],
            })
            .catch(() => null),
          basePublicClient
            .readContract({
              address: coreAddress,
              abi: VAULTPAY_CORE_ABI,
              functionName: "rules",
              args: [userAddress],
            })
            .catch(() => null),
        ]);

        if (summary) {
          vaultTotalEth = Number(formatEther(summary[0])).toFixed(4);
          lockedSavingsEth = Number(formatEther(summary[1])).toFixed(4);
          spendingBalanceEth = Number(formatEther(summary[2])).toFixed(4);
          totalBillsPaidEth = Number(formatEther(summary[3])).toFixed(4);
          savingsUnlockTimestamp = summary[4];
          secondsUntilUnlock = summary[5];
          if (
            summary[6] &&
            summary[6] !== "0x0000000000000000000000000000000000000000"
          ) {
            safeBackupWallet = summary[6];
          }
          isFrozen = summary[7];
        }

        if (rule && rule[7]) {
          savingsBps = Number(rule[0]);
          billsBps = Number(rule[1]);
          maxSafeWithdrawEth = Number(formatEther(rule[3])).toFixed(2);
          billsAddress = rule[5];
          safeBackupWallet = rule[6];
          isConfigured = rule[7];
          isFrozen = rule[8];
        }
      }

      // Fetch real recent on-chain logs from VaultPayCore on Base Sepolia
      if (baseBlock) {
        const fromBlock =
          baseBlock.number > BigInt(8000)
            ? baseBlock.number - BigInt(8000)
            : BigInt(0);

        const [
          salaryLogs,
          splitLogs,
          suspiciousLogs,
          panicLogs,
          escapeLogs,
        ] = await Promise.all([
          basePublicClient
            .getLogs({
              address: coreAddress,
              event: parseAbiItem(
                "event SalaryReceived(address indexed user, uint256 amount, uint256 timestamp)"
              ),
              fromBlock,
              toBlock: "latest",
            })
            .catch(() => []),
          basePublicClient
            .getLogs({
              address: coreAddress,
              event: parseAbiItem(
                "event SalarySplitCompleted(address indexed user, uint256 lockedSavingsAmount, uint256 billsPaidAmount, uint256 spendingAmount, uint256 savingsUnlockTimestamp, uint256 timestamp)"
              ),
              fromBlock,
              toBlock: "latest",
            })
            .catch(() => []),
          basePublicClient
            .getLogs({
              address: coreAddress,
              event: parseAbiItem(
                "event SuspiciousActivityDetected(address indexed user, uint256 attemptedAmount, uint256 timestamp, string reason)"
              ),
              fromBlock,
              toBlock: "latest",
            })
            .catch(() => []),
          basePublicClient
            .getLogs({
              address: coreAddress,
              event: parseAbiItem(
                "event PanicButtonPressed(address indexed user, uint256 totalBalanceAtRisk, uint256 timestamp)"
              ),
              fromBlock,
              toBlock: "latest",
            })
            .catch(() => []),
          basePublicClient
            .getLogs({
              address: coreAddress,
              event: parseAbiItem(
                "event AutoEscapeExecuted(address indexed user, address indexed safeBackupWallet, uint256 totalEvacuatedAmount, string triggerReason, uint256 timestamp)"
              ),
              fromBlock,
              toBlock: "latest",
            })
            .catch(() => []),
        ]);

        for (const l of salaryLogs) {
          combined.push({
            sortKey: l.blockNumber || BigInt(0),
            row: {
              id: `${l.transactionHash}-sal`,
              eventTitle: "SalaryReceived (Base)",
              originUser: formatShortAddress(l.args.user || ""),
              txHash: l.transactionHash || "",
              blockTimestamp: String(l.args.timestamp || ""),
              callbackLabel: `+${Number(
                formatEther(l.args.amount || BigInt(0))
              ).toFixed(4)} ETH`,
              status: "Confirmed",
              explorerUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${l.transactionHash}`,
              explorerName: "BaseScan",
            },
          });
        }

        for (const l of splitLogs) {
          combined.push({
            sortKey: l.blockNumber || BigInt(0),
            row: {
              id: `${l.transactionHash}-spl`,
              eventTitle: "SalarySplitCompleted",
              originUser: formatShortAddress(l.args.user || ""),
              txHash: l.transactionHash || "",
              blockTimestamp: String(l.args.timestamp || ""),
              callbackLabel: "executeSalarySplit",
              status: "Locked",
              explorerUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${l.transactionHash}`,
              explorerName: "BaseScan",
            },
          });
        }

        for (const l of suspiciousLogs) {
          combined.push({
            sortKey: l.blockNumber || BigInt(0),
            row: {
              id: `${l.transactionHash}-sus`,
              eventTitle: "SuspiciousActivity",
              originUser: formatShortAddress(l.args.user || ""),
              txHash: l.transactionHash || "",
              blockTimestamp: String(l.args.timestamp || ""),
              callbackLabel: l.args.reason || "AUTO_HACK_DEFENSE",
              status: "Active",
              explorerUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${l.transactionHash}`,
              explorerName: "BaseScan",
            },
          });
        }

        for (const l of panicLogs) {
          combined.push({
            sortKey: l.blockNumber || BigInt(0),
            row: {
              id: `${l.transactionHash}-pan`,
              eventTitle: "PanicButtonPressed",
              originUser: formatShortAddress(l.args.user || ""),
              txHash: l.transactionHash || "",
              blockTimestamp: String(l.args.timestamp || ""),
              callbackLabel: "USER_PANIC_BUTTON",
              status: "Evacuated",
              explorerUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${l.transactionHash}`,
              explorerName: "BaseScan",
            },
          });
        }

        for (const l of escapeLogs) {
          combined.push({
            sortKey: l.blockNumber || BigInt(0),
            row: {
              id: `${l.transactionHash}-esc`,
              eventTitle: "AutoEscapeExecuted",
              originUser: formatShortAddress(l.args.user || ""),
              txHash: l.transactionHash || "",
              blockTimestamp: String(l.args.timestamp || ""),
              callbackLabel: `Swept ${Number(
                formatEther(l.args.totalEvacuatedAmount || BigInt(0))
              ).toFixed(4)} ETH`,
              status: "Evacuated",
              explorerUrl: `${NETWORKS.BASE_SEPOLIA.explorerUrl}/tx/${l.transactionHash}`,
              explorerName: "BaseScan",
            },
          });
        }
      }
    }
  }

  // Also fetch Reactive Omni logs (ReactiveDecisionDispatched) from Reactive Lasna Testnet (5318007)
  if (reactiveAddress && isAddress(reactiveAddress)) {
    const rCode = await reactivePublicClient
      .getBytecode({ address: reactiveAddress })
      .catch(() => undefined);
    if (rCode && rCode !== "0x") {
      const [splits, escapes] = await Promise.all([
        reactivePublicClient
          .readContract({
            address: reactiveAddress,
            abi: VAULTPAY_REACTIVE_ABI,
            functionName: "totalSplitsDispatched",
          })
          .catch(() => BigInt(0)),
        reactivePublicClient
          .readContract({
            address: reactiveAddress,
            abi: VAULTPAY_REACTIVE_ABI,
            functionName: "totalEscapesDispatched",
          })
          .catch(() => BigInt(0)),
      ]);
      reactiveSplitsCount = Number(splits);
      reactiveEscapesCount = Number(escapes);

      if (reactiveBlock > BigInt(0)) {
        const fromRBlock =
          reactiveBlock > BigInt(4000)
            ? reactiveBlock - BigInt(4000)
            : BigInt(0);
        const reactiveLogs = await reactivePublicClient
          .getLogs({
            address: reactiveAddress,
            event: parseAbiItem(
              "event ReactiveDecisionDispatched(uint256 indexed originTopic0, address indexed user, string action, uint256 originTimestamp)"
            ),
            fromBlock: fromRBlock,
            toBlock: "latest",
          })
          .catch(() => []);

        for (const rl of reactiveLogs) {
          combined.push({
            sortKey: (rl.blockNumber || BigInt(0)) + BigInt(100_000_000),
            row: {
              id: `${rl.transactionHash}-omni`,
              eventTitle: "ReactiveDecision (Omni)",
              originUser: formatShortAddress(rl.args.user || ""),
              txHash: rl.transactionHash || "",
              blockTimestamp: String(rl.args.originTimestamp || ""),
              callbackLabel: rl.args.action || "CallbackV_1_0",
              status: "Confirmed",
              explorerUrl: `${NETWORKS.REACTIVE_OMNI.explorerUrl}/tx/${rl.transactionHash}`,
              explorerName: "ReactScan",
            },
          });
        }
      }
    }
  }

  combined.sort((a, b) =>
    b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0
  );

  const events: OnChainEventRow[] = combined.slice(0, 6).map((item, idx) => ({
    ...item.row,
    rank: `#${idx + 1}`,
  }));

  return {
    state: {
      baseBlockNumber: baseBlock?.number || BigInt(0),
      baseBlockTimestamp: baseBlock?.timestamp || BigInt(0),
      reactiveBlockNumber: reactiveBlock,
      walletEthBalance,
      vaultTotalEth,
      lockedSavingsEth,
      spendingBalanceEth,
      totalBillsPaidEth,
      savingsUnlockTimestamp,
      secondsUntilUnlock,
      safeBackupWallet,
      billsAddress,
      savingsBps,
      billsBps,
      maxSafeWithdrawEth,
      isConfigured,
      isFrozen,
      reactiveSplitsCount,
      reactiveEscapesCount,
    },
    events,
  };
}

// ============================================================================
// REAL ON-CHAIN DEPLOYMENT & WRITE TRANSACTIONS VIA METAMASK
// ============================================================================

export async function deployVaultPayCoreOnBase(
  account: `0x${string}`
): Promise<{ contractAddress: `0x${string}`; txHash: `0x${string}` }> {
  await switchToChain("BASE_SEPOLIA");
  const walletClient = createWalletClient({
    account,
    chain: baseSepoliaChain,
    transport: custom(window.ethereum!),
  });

  const txHash = await walletClient.deployContract({
    abi: VAULTPAY_CORE_ABI,
    bytecode: VAULTPAY_CORE_BYTECODE,
    args: [NETWORKS.BASE_SEPOLIA.callbackProxy],
    account,
  });

  const receipt = await basePublicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  if (!receipt.contractAddress) {
    throw new Error(
      "Deployment transaction confirmed, but no contractAddress returned."
    );
  }

  return {
    contractAddress: receipt.contractAddress,
    txHash,
  };
}

export async function deployVaultPayReactiveOnOmni(
  account: `0x${string}`,
  vaultPayCoreAddress: `0x${string}`
): Promise<{ contractAddress: `0x${string}`; txHash: `0x${string}` }> {
  await switchToChain("REACTIVE_OMNI");
  const walletClient = createWalletClient({
    account,
    chain: reactiveOmniChain,
    transport: custom(window.ethereum!),
  });

  const txHash = await walletClient.deployContract({
    abi: VAULTPAY_REACTIVE_ABI,
    bytecode: VAULTPAY_REACTIVE_BYTECODE,
    args: [vaultPayCoreAddress],
    value: parseEther("0.01"),
    account,
  });

  const receipt = await reactivePublicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  await switchToChain("BASE_SEPOLIA");

  if (!receipt.contractAddress) {
    throw new Error(
      "Reactive contract deployment confirmed, but no contractAddress returned."
    );
  }

  return {
    contractAddress: receipt.contractAddress,
    txHash,
  };
}

export async function configureRulesOnChain(
  account: `0x${string}`,
  coreAddress: `0x${string}`,
  params: {
    savingsBps: number;
    billsBps: number;
    lockDurationSeconds: bigint;
    maxSafeWithdrawEth: string;
    cooldownSeconds: bigint;
    billsAddress: `0x${string}`;
    safeBackupWallet: `0x${string}`;
  }
): Promise<`0x${string}`> {
  await switchToChain("BASE_SEPOLIA");
  const walletClient = createWalletClient({
    account,
    chain: baseSepoliaChain,
    transport: custom(window.ethereum!),
  });

  const txHash = await walletClient.writeContract({
    address: coreAddress,
    abi: VAULTPAY_CORE_ABI,
    functionName: "configureRules",
    args: [
      params.savingsBps,
      params.billsBps,
      params.lockDurationSeconds,
      parseEther(params.maxSafeWithdrawEth || "0.3"),
      params.cooldownSeconds,
      params.billsAddress,
      params.safeBackupWallet,
    ],
  });

  await basePublicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function depositSalaryOnChain(
  account: `0x${string}`,
  coreAddress: `0x${string}`,
  ethAmount: string
): Promise<`0x${string}`> {
  await switchToChain("BASE_SEPOLIA");
  const walletClient = createWalletClient({
    account,
    chain: baseSepoliaChain,
    transport: custom(window.ethereum!),
  });

  const txHash = await walletClient.writeContract({
    address: coreAddress,
    abi: VAULTPAY_CORE_ABI,
    functionName: "depositSalary",
    value: parseEther(ethAmount),
  });

  await basePublicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function withdrawSpendingOnChain(
  account: `0x${string}`,
  coreAddress: `0x${string}`,
  ethAmount: string
): Promise<`0x${string}`> {
  await switchToChain("BASE_SEPOLIA");
  const walletClient = createWalletClient({
    account,
    chain: baseSepoliaChain,
    transport: custom(window.ethereum!),
  });

  const txHash = await walletClient.writeContract({
    address: coreAddress,
    abi: VAULTPAY_CORE_ABI,
    functionName: "withdrawSpending",
    args: [parseEther(ethAmount)],
  });

  await basePublicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function withdrawLockedSavingsOnChain(
  account: `0x${string}`,
  coreAddress: `0x${string}`,
  ethAmount: string
): Promise<`0x${string}`> {
  await switchToChain("BASE_SEPOLIA");
  const walletClient = createWalletClient({
    account,
    chain: baseSepoliaChain,
    transport: custom(window.ethereum!),
  });

  const txHash = await walletClient.writeContract({
    address: coreAddress,
    abi: VAULTPAY_CORE_ABI,
    functionName: "withdrawLockedSavings",
    args: [parseEther(ethAmount)],
  });

  await basePublicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function triggerAnomalyOnChain(
  account: `0x${string}`,
  coreAddress: `0x${string}`,
  attemptedEth: string
): Promise<`0x${string}`> {
  await switchToChain("BASE_SEPOLIA");
  const walletClient = createWalletClient({
    account,
    chain: baseSepoliaChain,
    transport: custom(window.ethereum!),
  });

  const txHash = await walletClient.writeContract({
    address: coreAddress,
    abi: VAULTPAY_CORE_ABI,
    functionName: "simulateHackAttempt",
    args: [parseEther(attemptedEth || "0.8")],
  });

  await basePublicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function triggerPanicButtonOnChain(
  account: `0x${string}`,
  coreAddress: `0x${string}`
): Promise<`0x${string}`> {
  await switchToChain("BASE_SEPOLIA");
  const walletClient = createWalletClient({
    account,
    chain: baseSepoliaChain,
    transport: custom(window.ethereum!),
  });

  const txHash = await walletClient.writeContract({
    address: coreAddress,
    abi: VAULTPAY_CORE_ABI,
    functionName: "triggerPanicButton",
    args: [],
  });

  await basePublicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}
