/**
 * ShadowRoll Event History Service (v1.2)
 * 
 * Fetches historical on-chain events from Arbitrum Sepolia using viem's getLogs.
 * This serves as a practical alternative to The Graph until the subgraph is deployed.
 * 
 * When The Graph subgraph is live, replace `fetchFromChain()` calls with
 * GraphQL queries to the subgraph endpoint.
 */

import { createPublicClient, http, parseAbiItem, type Log } from "viem";
import { arbitrumSepolia } from "viem/chains";

const CONTRACT_ADDRESS = "0x3a2673fE2AB583242EAC778eD0b685a53d508A33" as const;

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

export interface HistoryEvent {
  id: string;
  type: "deposit" | "schedule" | "claim" | "revoke" | "batch" | "recurring";
  description: string;
  txHash: string;
  blockNumber: bigint;
  timestamp: number;
  employer?: string;
  recipient?: string;
  amount?: string;
}

function logToEvent(log: Log, type: HistoryEvent["type"], description: string, extra?: Partial<HistoryEvent>): HistoryEvent {
  return {
    id: `${log.transactionHash}-${log.logIndex}`,
    type,
    description,
    txHash: log.transactionHash || "0x",
    blockNumber: log.blockNumber ?? BigInt(0),
    timestamp: Date.now(),
    ...extra,
  };
}

export async function fetchPoolFundedEvents(employer?: string): Promise<HistoryEvent[]> {
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: parseAbiItem("event PoolFunded(address indexed employer, uint256 amount)"),
    fromBlock: BigInt(0),
    toBlock: "latest",
    ...(employer ? { args: { employer: employer as `0x${string}` } } : {}),
  });

  return logs.map(log => {
    const amt = Number(log.args.amount ?? BigInt(0)) / 1e18;
    return logToEvent(log, "deposit", `Deposited ${amt.toFixed(2)} MTK`, {
      employer: log.args.employer,
      amount: amt.toString(),
    });
  });
}

export async function fetchPaymentScheduledEvents(filterAddress?: string): Promise<HistoryEvent[]> {
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: parseAbiItem("event PaymentScheduled(address indexed employer, address indexed recipient)"),
    fromBlock: BigInt(0),
    toBlock: "latest",
  });

  const filtered = filterAddress
    ? logs.filter(l => l.args.employer === filterAddress || l.args.recipient === filterAddress)
    : logs;

  return filtered.map(log => {
    const rec = log.args.recipient ?? "0x";
    return logToEvent(log, "schedule", `Scheduled payment → ${rec.slice(0, 6)}...${rec.slice(-4)}`, {
      employer: log.args.employer,
      recipient: log.args.recipient,
    });
  });
}

export async function fetchPaymentClaimedEvents(recipient?: string): Promise<HistoryEvent[]> {
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: parseAbiItem("event PaymentClaimed(address indexed recipient)"),
    fromBlock: BigInt(0),
    toBlock: "latest",
    ...(recipient ? { args: { recipient: recipient as `0x${string}` } } : {}),
  });

  return logs.map(log =>
    logToEvent(log, "claim", `Funds claimed by ${(log.args.recipient ?? "0x").slice(0, 6)}...${(log.args.recipient ?? "0x").slice(-4)}`, {
      recipient: log.args.recipient,
    })
  );
}

export async function fetchPaymentRevokedEvents(employer?: string): Promise<HistoryEvent[]> {
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: parseAbiItem("event PaymentRevoked(address indexed employer, address indexed recipient)"),
    fromBlock: BigInt(0),
    toBlock: "latest",
    ...(employer ? { args: { employer: employer as `0x${string}` } } : {}),
  });

  return logs.map(log => {
    const rec = log.args.recipient ?? "0x";
    return logToEvent(log, "revoke", `Revoked payment for ${rec.slice(0, 6)}...${rec.slice(-4)}`, {
      employer: log.args.employer,
      recipient: log.args.recipient,
    });
  });
}

// Fetch ALL events for an employer, sorted by block number (newest first)
export async function fetchAllEmployerHistory(employer: string): Promise<HistoryEvent[]> {
  const [deposits, schedules, claims, revokes] = await Promise.all([
    fetchPoolFundedEvents(employer),
    fetchPaymentScheduledEvents(employer),
    fetchPaymentClaimedEvents(),
    fetchPaymentRevokedEvents(employer),
  ]);

  return [...deposits, ...schedules, ...claims, ...revokes]
    .sort((a, b) => Number(b.blockNumber - a.blockNumber));
}

// Fetch ALL events for a recipient
export async function fetchAllRecipientHistory(recipient: string): Promise<HistoryEvent[]> {
  const [schedules, claims] = await Promise.all([
    fetchPaymentScheduledEvents(recipient),
    fetchPaymentClaimedEvents(recipient),
  ]);

  return [...schedules, ...claims]
    .sort((a, b) => Number(b.blockNumber - a.blockNumber));
}
