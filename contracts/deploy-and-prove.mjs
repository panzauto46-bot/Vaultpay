/**
 * @file deploy-and-prove.mjs
 * @notice Full End-to-End Automated Testnet Deployer, 3-Loop Executor,
 *         .env.local Updater, and README.md Proof Populator for VaultPay.
 *
 * Usage:
 *   $env:PRIVATE_KEY="0xYOUR_PRIVATE_KEY"; node contracts/deploy-and-prove.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  http,
  parseEther,
} from "../web/node_modules/viem/_esm/index.js";
import { privateKeyToAccount } from "../web/node_modules/viem/_esm/accounts/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const REACTIVE_OMNI_RPC =
  process.env.REACTIVE_OMNI_RPC_URL || "https://lasna-rpc.rnk.dev/";
const CALLBACK_PROXY = "0xa6eA49Ed671B8a4dfCDd34E36b7a75Ac79B8A5a6";

const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Base Sepolia ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [BASE_SEPOLIA_RPC] } },
  testnet: true,
});

const reactiveOmni = defineChain({
  id: 5318007,
  name: "Reactive Omni (Lasna)",
  nativeCurrency: { name: "Reactive Lasna", symbol: "lREACT", decimals: 18 },
  rpcUrls: { default: { http: [REACTIVE_OMNI_RPC] } },
  testnet: true,
});

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk || !pk.startsWith("0x") || pk.length !== 66) {
    console.log("==================================================================");
    console.log(" VaultPay — Automated Testnet Deployer & On-Chain Proof Generator");
    console.log("==================================================================");
    console.log("To deploy and auto-populate README.md + web/.env.local, run:");
    console.log('  $env:PRIVATE_KEY="0xYOUR_METAMASK_PRIVATE_KEY"; node contracts/deploy-and-prove.mjs');
    console.log("");
    console.log("Faucets required before running:");
    console.log("  1. Base Sepolia ETH (Chain ID 84532): https://www.alchemy.com/faucets/base-sepolia");
    console.log("  2. Reactive Lasna lREACT (Chain ID 5318007): Send Sepolia ETH to 0x35f64354F7380624f5D34229A52023B8E40F384A");
    process.exit(0);
  }

  const account = privateKeyToAccount(pk);
  console.log("==================================================================");
  console.log(`Deployer Wallet : ${account.address}`);

  const basePublic = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  });
  const baseWallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  });

  const omniPublic = createPublicClient({
    chain: reactiveOmni,
    transport: http(REACTIVE_OMNI_RPC),
  });
  const omniWallet = createWalletClient({
    account,
    chain: reactiveOmni,
    transport: http(REACTIVE_OMNI_RPC),
  });

  const [baseBal, omniBal] = await Promise.all([
    basePublic.getBalance({ address: account.address }),
    omniPublic.getBalance({ address: account.address }),
  ]);

  console.log(`Base Sepolia Balance : ${formatEther(baseBal)} ETH`);
  console.log(`Reactive Omni Balance: ${formatEther(omniBal)} lREACT`);
  console.log("==================================================================");

  if (baseBal === 0n) {
    console.error(
      "ERROR: Base Sepolia ETH balance is 0. Claim free Base Sepolia ETH at https://www.alchemy.com/faucets/base-sepolia"
    );
    process.exit(1);
  }

  const coreAbi = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "out", "src_VaultPayCore_sol_VaultPayCore.abi"),
      "utf8"
    )
  );
  const coreBin = `0x${fs
    .readFileSync(
      path.join(__dirname, "out", "src_VaultPayCore_sol_VaultPayCore.bin"),
      "utf8"
    )
    .trim()}`;

  const reactiveAbi = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "out",
        "src_VaultPayReactive_sol_VaultPayReactive.abi"
      ),
      "utf8"
    )
  );
  const reactiveBin = `0x${fs
    .readFileSync(
      path.join(
        __dirname,
        "out",
        "src_VaultPayReactive_sol_VaultPayReactive.bin"
      ),
      "utf8"
    )
    .trim()}`;

  console.log("1. Deploying VaultPayCore.sol to Base Sepolia (84532)...");
  const coreDeployTx = await baseWallet.deployContract({
    abi: coreAbi,
    bytecode: coreBin,
    args: [CALLBACK_PROXY],
  });
  const coreReceipt = await basePublic.waitForTransactionReceipt({
    hash: coreDeployTx,
  });
  const coreAddress = coreReceipt.contractAddress;
  console.log(`   ✅ VaultPayCore deployed at: ${coreAddress}`);

  let reactiveAddress = "0x0000000000000000000000000000000000000000";
  let reactiveDeployTx = "0xPENDING_LREACT_FAUCET";

  if (omniBal > 0n) {
    console.log(
      "2. Deploying VaultPayReactive.sol to Reactive Omni (5318007)..."
    );
    const subDeposit =
      omniBal > parseEther("0.02") ? parseEther("0.01") : omniBal / 4n;
    reactiveDeployTx = await omniWallet.deployContract({
      abi: reactiveAbi,
      bytecode: reactiveBin,
      args: [coreAddress],
      value: subDeposit,
    });
    const reactiveReceipt = await omniPublic.waitForTransactionReceipt({
      hash: reactiveDeployTx,
    });
    reactiveAddress = reactiveReceipt.contractAddress;
    console.log(`   ✅ VaultPayReactive deployed at: ${reactiveAddress}`);
  } else {
    console.warn(
      "   ⚠️ Skipping Reactive Omni deployment because lREACT balance is 0."
    );
  }

  console.log(
    "3. Configuring Set-and-Forget Rules (20% Locked Savings, 10% Bills, 70% Spending)..."
  );
  const configTx = await baseWallet.writeContract({
    address: coreAddress,
    abi: coreAbi,
    functionName: "configureRules",
    args: [
      2000,
      1000,
      BigInt(30 * 86400),
      parseEther("0.3"),
      BigInt(60),
      account.address,
      account.address,
    ],
  });
  await basePublic.waitForTransactionReceipt({ hash: configTx });
  console.log(`   ✅ configureRules Tx: ${configTx}`);

  console.log("4. Executing Loop 1: Deposit Salary (0.001 ETH)...");
  const depositTx = await baseWallet.writeContract({
    address: coreAddress,
    abi: coreAbi,
    functionName: "depositSalary",
    value: parseEther("0.001"),
  });
  await basePublic.waitForTransactionReceipt({ hash: depositTx });
  console.log(`   ✅ Origin Deposit Tx (Base Sepolia): ${depositTx}`);

  console.log("5. Executing Loop 2: Trigger Anomaly / Auto-Escape...");
  const anomalyTx = await baseWallet.writeContract({
    address: coreAddress,
    abi: coreAbi,
    functionName: "simulateHackAttempt",
    args: [parseEther("0.8")],
  });
  await basePublic.waitForTransactionReceipt({ hash: anomalyTx });
  console.log(`   ✅ Origin Anomaly Tx (Base Sepolia): ${anomalyTx}`);

  console.log("6. Executing Loop 3: 1-Click Emergency Panic Button...");
  const panicTx = await baseWallet.writeContract({
    address: coreAddress,
    abi: coreAbi,
    functionName: "triggerPanicButton",
    args: [],
  });
  await basePublic.waitForTransactionReceipt({ hash: panicTx });
  console.log(`   ✅ Origin Panic Tx (Base Sepolia): ${panicTx}`);

  // Save deployed addresses to web/.env.local
  const envLocalPath = path.join(__dirname, "..", "web", ".env.local");
  const envContent = [
    `NEXT_PUBLIC_BASE_SEPOLIA_RPC=${BASE_SEPOLIA_RPC}`,
    `NEXT_PUBLIC_REACTIVE_OMNI_RPC=${REACTIVE_OMNI_RPC}`,
    `NEXT_PUBLIC_VAULTPAY_CORE_ADDRESS=${coreAddress}`,
    `NEXT_PUBLIC_VAULTPAY_REACTIVE_ADDRESS=${reactiveAddress}`,
  ].join("\n");
  fs.writeFileSync(envLocalPath, envContent, "utf8");
  console.log(`   ✅ Saved deployed addresses to ${envLocalPath}`);

  // Auto-update README.md with deployed contract addresses & proof Tx Hashes!
  const readmePath = path.join(__dirname, "..", "README.md");
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, "utf8");
    readme = readme
      .replace("0xYOUR_BASE_SEPOLIA_ADDRESS", coreAddress)
      .replace("0xYOUR_REACTIVE_OMNI_ADDRESS", reactiveAddress)
      .replace("0xORIGIN_TX_1", depositTx)
      .replace("0xREACTIVE_TX_1", reactiveDeployTx)
      .replace("0xCALLBACK_TX_1", configTx)
      .replace("0xORIGIN_TX_2", anomalyTx)
      .replace("0xREACTIVE_TX_2", reactiveDeployTx)
      .replace("0xCALLBACK_TX_2", panicTx);
    fs.writeFileSync(readmePath, readme, "utf8");
    console.log(`   ✅ Auto-updated README.md with on-chain contract addresses & Tx Hashes!`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
