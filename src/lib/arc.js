import "server-only";
import { ARC } from "@/data/arc";
import ESCROW_ABI from "@/data/arcEscrowAbi.json";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  getAddress,
  http,
  isAddress,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Talks to ShortWorksEscrow on Arc (docs/arc-payments.md), always on the server's network
// (NEXT_PUBLIC_ARC_NETWORK), never the one picked on /pay-with-arc. Keys come from:
//   ARC_ESCROW_ADDRESS        the deployed contract
//   ARC_SIGNER_PRIVATE_KEY    signs the job terms only
//   ARC_OPERATOR_PRIVATE_KEY  sends release / refund / setFrozen (needs USDC for gas)

export const arcChain = defineChain({
  id: ARC.chainId,
  name: ARC.name,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC.rpcUrl] } },
  blockExplorers: { default: { name: "Explorer", url: ARC.explorerUrl } },
});

const publicClient = createPublicClient({ chain: arcChain, transport: http(ARC.rpcUrl, { timeout: 20_000 }) });
const RECEIPT_TIMEOUT = 60_000;

// The escrow address when Arc payments are set up on this server, otherwise null.
export function escrowAddress() {
  const a = process.env.ARC_ESCROW_ADDRESS;
  if (!a || !isAddress(a) || !process.env.ARC_SIGNER_PRIVATE_KEY || !process.env.ARC_OPERATOR_PRIVATE_KEY) return null;
  return getAddress(a);
}
export const arcEnabled = () => escrowAddress() !== null;

// A readable message from a viem / RPC error.
export const chainMessage = (err) => err?.shortMessage ?? err?.message ?? String(err);

const account = (envKey) => privateKeyToAccount(process.env[envKey]);

// ---- Reads ------------------------------------------------------------------------

const JOB_STATUSES = ["none", "funded", "released", "refunded"];

// The contract's record of a job.
export async function readEscrowJob(escrow, escrowJobId) {
  const [client, expiresAt, status, freelancer, frozenAt, treasury, amount, fee] = await publicClient.readContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "jobs",
    args: [BigInt(escrowJobId)],
  });
  return {
    client,
    freelancer,
    treasury,
    amount,
    fee,
    status: JOB_STATUSES[status],
    frozen: frozenAt !== 0n,
    expiresAt: new Date(Number(expiresAt) * 1000),
  };
}

const USDC_ABI = [
  ...erc20Abi,
  { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "nonces", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
];

// What the client's browser needs to sign a USDC permit, plus their balance.
export async function readUsdc(owner) {
  const read = (functionName, args = []) => publicClient.readContract({ address: ARC.usdc, abi: USDC_ABI, functionName, args });
  const [name, version, nonce, balance] = await Promise.all([
    read("name"),
    read("version"),
    read("nonces", [owner]),
    read("balanceOf", [owner]),
  ]);
  return { name, version, nonce, balance };
}

// Waits for a transaction (Arc confirms in about a second). Throws if it isn't found in time.
export const waitForReceipt = (hash) => publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT });

// The escrow's events of one kind in a receipt (other contracts' logs are ignored).
export function escrowEvents(receipt, escrow, eventName) {
  return parseEventLogs({ abi: ESCROW_ABI, logs: receipt.logs, eventName }).filter(
    (l) => l.address.toLowerCase() === escrow.toLowerCase(),
  );
}

// ---- Writes -----------------------------------------------------------------------

const TERMS_TYPES = {
  Terms: [
    { name: "jobId", type: "uint256" },
    { name: "client", type: "address" },
    { name: "freelancer", type: "address" },
    { name: "amount", type: "uint128" },
    { name: "fee", type: "uint128" },
    { name: "expiresAt", type: "uint64" },
    { name: "signatureDeadline", type: "uint64" },
  ],
};

// ShortWorks' EIP-712 signature on a job's terms; the contract only funds terms signed this way.
export function signTerms(escrow, terms) {
  return account("ARC_SIGNER_PRIVATE_KEY").signTypedData({
    domain: { name: "ShortWorksEscrow", version: "1", chainId: ARC.chainId, verifyingContract: escrow },
    types: TERMS_TYPES,
    primaryType: "Terms",
    message: terms,
  });
}

export const operatorAddress = () => account("ARC_OPERATOR_PRIVATE_KEY").address;

// Sends release / refund / setFrozen from the operator wallet and waits for it to succeed.
// The simulation first turns a revert (e.g. already released) into an error before any gas is spent.
export async function sendAsOperator(escrow, functionName, args) {
  const operator = account("ARC_OPERATOR_PRIVATE_KEY");
  const wallet = createWalletClient({ account: operator, chain: arcChain, transport: http(ARC.rpcUrl, { timeout: 20_000 }) });
  const { request } = await publicClient.simulateContract({ account: operator, address: escrow, abi: ESCROW_ABI, functionName, args });
  const hash = await wallet.writeContract(request);
  const receipt = await waitForReceipt(hash);
  if (receipt.status !== "success") throw new Error(`transaction ${hash} failed`);
  return hash;
}
