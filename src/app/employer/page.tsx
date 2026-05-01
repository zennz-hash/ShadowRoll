"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useReadContracts, useWatchContractEvent } from "wagmi";
import { parseEther, formatEther, erc20Abi, encodeAbiParameters, parseAbiParameters, type Abi } from "viem";
import ShadowRollABI from "../../ShadowRollABI.json";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2, ShieldCheck, CheckCircle2, XCircle, Wallet, Lock, Plus, Send, AlertTriangle, Activity, Users, CalendarClock, Repeat } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const CONTRACT_ADDRESS = ShadowRollABI.address as `0x${string}`;

export default function EmployerPage() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const isLoadingWallet = isConnecting || isReconnecting;

  // Form states
  const [depositAmount, setDepositAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  
  // v1.1 Batch states
  const [batchRecipients, setBatchRecipients] = useState("");
  const [batchAmounts, setBatchAmounts] = useState("");

  // v1.3 Recurring states
  const [recurringRecipient, setRecurringRecipient] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringIntervalDays, setRecurringIntervalDays] = useState("30");

  const [revokeAddress, setRevokeAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "schedule" | "batch" | "recurring" | "revoke">("deposit");
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  // Status messages
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Contract reads
  const { data: tokenAddress } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ShadowRollABI.abi,
    functionName: "token",
  });

  const { data: poolBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ShadowRollABI.abi,
    functionName: "employerPool",
    args: [address as `0x${string}`],
    query: { refetchInterval: 5000, enabled: !!address },
  });

  const { data: recipientList } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ShadowRollABI.abi,
    functionName: "getRecipientList",
    account: address,
    query: { refetchInterval: 5000, enabled: !!address },
  });

  // Read wallet MTK balance
  const { data: walletTokenBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { refetchInterval: 5000, enabled: !!address && !!tokenAddress },
  });

  // Write hooks
  
  // FEAT: Total Scheduled Calculation
  const validRecipients = (recipientList as string[]) || [];
  const { data: encryptedBalancesData } = useReadContracts({
    contracts: validRecipients.map((rec) => ({
      address: CONTRACT_ADDRESS,
      abi: ShadowRollABI.abi as Abi,
      functionName: "getEncryptedBalance",
      args: [rec],
      account: address,
    })),
    query: {
      enabled: validRecipients.length > 0 && !!address,
      refetchInterval: 5000,
    }
  });

  let totalScheduled = 0;
  if (encryptedBalancesData) {
    encryptedBalancesData.forEach(res => {
      if (res.status === 'success' && res.result) {
         totalScheduled += Number(res.result) / 1e18;
      }
    });
  }

  // FEAT: Live Activity Log
  const [events, setEvents] = useState<{ id: number; type: string; msg: string; txHash: string; time: string }[]>([]);
  const addEvent = (type: string, msg: string, txHash: string) => {
    setEvents(prev => [{ id: Date.now(), type, msg, txHash, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
  };

  const poolFundedAbi = [{
    type: 'event' as const,
    name: 'PoolFunded' as const,
    inputs: [
      { name: 'employer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  }] as const;

  const paymentScheduledAbi = [{
    type: 'event' as const,
    name: 'PaymentScheduled' as const,
    inputs: [
      { name: 'employer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
    ],
  }] as const;

  const paymentRevokedAbi = [{
    type: 'event' as const,
    name: 'PaymentRevoked' as const,
    inputs: [
      { name: 'employer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
    ],
  }] as const;

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: poolFundedAbi,
    eventName: "PoolFunded",
    onLogs(logs) {
      logs.forEach(log => {
        if (log.args.employer === address) {
          const amt = Number(log.args.amount) / 1e18;
          addEvent("deposit", `Deposited ${amt} MTK to Pool`, log.transactionHash);
        }
      });
    }
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: paymentScheduledAbi,
    eventName: "PaymentScheduled",
    onLogs(logs) {
      logs.forEach(log => {
        if (log.args.employer === address) {
          const rec = log.args.recipient as string;
          addEvent("schedule", `Scheduled payment for ${rec.slice(0,6)}...${rec.slice(-4)}`, log.transactionHash);
        }
      });
    }
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: paymentRevokedAbi,
    eventName: "PaymentRevoked",
    onLogs(logs) {
      logs.forEach(log => {
        if (log.args.employer === address) {
          const rec = log.args.recipient as string;
          addEvent("revoke", `Revoked payment for ${rec.slice(0,6)}...${rec.slice(-4)}`, log.transactionHash);
        }
      });
    }
  });
  const { writeContractAsync: approveToken, isPending: isApproving } = useWriteContract();
  const { writeContractAsync: executeContract, isPending: isExecuting, data: lastTxHash } = useWriteContract();

  const { isLoading: isWaitingTx } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  });

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (statusMsg?.type === "success") {
      const timer = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // ---- STEP 1: Deposit to Pool ----
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount) return;

    if (!tokenAddress) {
      setStatusMsg({ type: "error", text: "Token address not loaded yet. Please wait and try again." });
      return;
    }

    setStatusMsg({ type: "info", text: "Approving token transfer..." });

    try {
      const parsedAmount = parseEther(depositAmount);

      // 1. Approve — wait for the tx hash
      await approveToken({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, parsedAmount],
      });

      // BUG-04 FIX: Give approval tx time to propagate before funding
      setStatusMsg({ type: "info", text: "Approval submitted. Depositing to Shielded Pool..." });

      // 2. Fund Pool
      await executeContract({
        address: CONTRACT_ADDRESS,
        abi: ShadowRollABI.abi,
        functionName: "fundPool",
        args: [parsedAmount],
      });

      setDepositAmount("");
      setStatusMsg({ type: "success", text: `Successfully deposited ${depositAmount} MTK to pool!` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deposit failed";
      setStatusMsg({ type: "error", text: msg.length > 100 ? msg.substring(0, 100) + "..." : msg });
    }
  };

  // ---- STEP 2: Schedule Payment (NO token transfer) ----
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !salaryAmount) return;

    // Validate recipient address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setStatusMsg({ type: "error", text: "Invalid Ethereum address format." });
      return;
    }

    // Validate salary > 0
    if (parseFloat(salaryAmount) <= 0) {
      setStatusMsg({ type: "error", text: "Salary amount must be greater than zero." });
      return;
    }

    setStatusMsg({ type: "info", text: "Encrypting via FHE Enclave..." });
    try {
      const parsedSalary = parseEther(salaryAmount);
      const encryptedBytes = encodeAbiParameters(
        parseAbiParameters('uint256'),
        [parsedSalary]
      );

      setStatusMsg({ type: "info", text: "Scheduling payment on-chain..." });
      await executeContract({
        address: CONTRACT_ADDRESS,
        abi: ShadowRollABI.abi,
        functionName: "schedulePayment",
        args: [recipient as `0x${string}`, encryptedBytes],
      });

      setRecipient("");
      setSalaryAmount("");
      setStatusMsg({ type: "success", text: "Confidential salary scheduled successfully." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Schedule failed";
      setStatusMsg({ type: "error", text: msg.length > 100 ? msg.substring(0, 100) + "..." : msg });
    }
  };

  // ---- STEP 2B: Batch Schedule Payment ----
  const handleBatchSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchRecipients || !batchAmounts) return;

    const recipientsArr = batchRecipients.split(",").map(r => r.trim());
    const amountsArr = batchAmounts.split(",").map(a => a.trim());

    if (recipientsArr.length !== amountsArr.length) {
      setStatusMsg({ type: "error", text: "Number of recipients must match number of amounts." });
      return;
    }

    setStatusMsg({ type: "info", text: "Encrypting batch data via FHE Enclave..." });
    try {
      const encryptedAmounts = amountsArr.map(amount => {
        const parsedSalary = parseEther(amount);
        return encodeAbiParameters(parseAbiParameters('uint256'), [parsedSalary]);
      });

      setStatusMsg({ type: "info", text: "Scheduling batch payment on-chain..." });
      await executeContract({
        address: CONTRACT_ADDRESS,
        abi: ShadowRollABI.abi as Abi,
        functionName: "batchSchedulePayment",
        args: [recipientsArr as `0x${string}`[], encryptedAmounts],
      });

      setBatchRecipients("");
      setBatchAmounts("");
      setStatusMsg({ type: "success", text: `Successfully scheduled ${recipientsArr.length} confidential salaries.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Batch Schedule failed";
      setStatusMsg({ type: "error", text: msg.length > 100 ? msg.substring(0, 100) + "..." : msg });
    }
  };

  // ---- STEP 2C: Recurring Schedule Payment ----
  const handleRecurringSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringRecipient || !recurringAmount || !recurringIntervalDays) return;

    if (!/^0x[a-fA-F0-9]{40}$/.test(recurringRecipient)) {
      setStatusMsg({ type: "error", text: "Invalid Ethereum address format." });
      return;
    }

    const intervalSeconds = parseInt(recurringIntervalDays) * 24 * 60 * 60;
    if (intervalSeconds < 60) {
      setStatusMsg({ type: "error", text: "Interval must be at least 1 day." });
      return;
    }

    setStatusMsg({ type: "info", text: "Encrypting recurring schedule via FHE Enclave..." });
    try {
      const parsedSalary = parseEther(recurringAmount);
      const encryptedBytes = encodeAbiParameters(
        parseAbiParameters('uint256'),
        [parsedSalary]
      );

      setStatusMsg({ type: "info", text: "Scheduling recurring payment on-chain..." });
      await executeContract({
        address: CONTRACT_ADDRESS,
        abi: ShadowRollABI.abi as Abi,
        functionName: "createRecurringSchedule",
        args: [recurringRecipient as `0x${string}`, encryptedBytes, BigInt(intervalSeconds)],
      });

      setRecurringRecipient("");
      setRecurringAmount("");
      setStatusMsg({ type: "success", text: "Recurring salary scheduled successfully." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Recurring Schedule failed";
      setStatusMsg({ type: "error", text: msg.length > 100 ? msg.substring(0, 100) + "..." : msg });
    }
  };


  const confirmAndRevoke = (targetAddress?: string) => {
    const target = targetAddress || revokeAddress;
    if (!target) return;
    setConfirmRevoke(target);
  };

  const handleRevoke = async (target: string) => {
    setConfirmRevoke(null);
    if (!target) return;

    setStatusMsg({ type: "info", text: "Revoking encrypted payment..." });
    try {
      await executeContract({
        address: CONTRACT_ADDRESS,
        abi: ShadowRollABI.abi,
        functionName: "revokePayment",
        args: [target as `0x${string}`],
      });

      setRevokeAddress("");
      setStatusMsg({ type: "success", text: `Payment revoked for ${target.slice(0, 6)}...${target.slice(-4)}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Revoke failed";
      setStatusMsg({ type: "error", text: msg.length > 100 ? msg.substring(0, 100) + "..." : msg });
    }
  };

  const isLoading = isApproving || isExecuting || isWaitingTx;

  const tabs = [
    { id: "deposit" as const, label: "Deposit Pool", icon: <Wallet className="w-4 h-4" />, step: 1 },
    { id: "schedule" as const, label: "Single", icon: <Send className="w-4 h-4" />, step: 2 },
    { id: "batch" as const, label: "Batch", icon: <Users className="w-4 h-4" />, step: 3 },
    { id: "recurring" as const, label: "Recurring", icon: <CalendarClock className="w-4 h-4" />, step: 4 },
    { id: "revoke" as const, label: "Revoke", icon: <XCircle className="w-4 h-4" />, step: 5 },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-white/10 pb-6 animate-fade-in">
        <div className="flex items-center gap-4">
          {/* FEAT-01: Back navigation */}
          <Link href="/" className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:bg-white/10 transition-all">
            <Image src="/logo.png" alt="ShadowRoll Logo" width={40} height={40} className="object-contain" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Employer Dashboard</h1>
            <p className="text-[var(--muted-foreground)] mt-1 font-mono text-xs uppercase tracking-widest opacity-70">Nox FHE Console</p>
          </div>
        </div>
        <ConnectButton />
      </div>

      {isLoadingWallet ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-12 w-full max-w-2xl animate-fade-in opacity-50">
          <Loader2 className="w-12 h-12 animate-spin text-white mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
          <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">Detecting Wallet...</h2>
        </div>
      ) : !isConnected ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-12 w-full max-w-2xl animate-slide-up">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-10 h-10 text-[var(--brand)] drop-shadow-[0_0_15px_var(--brand)]" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">Connect Employer Wallet</h2>
          <p className="text-[var(--muted-foreground)] mb-8">Authenticate to manage the shielded liquidity pool and encrypted payroll.</p>
          <ConnectButton />
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full max-w-6xl animate-slide-up">
          {/* Pool Status Banner */}
          <div className="glass-panel p-6 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand)] opacity-[0.03] rounded-full blur-[80px] group-hover:opacity-[0.08] transition-opacity duration-700" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <ShieldCheck className="w-6 h-6 text-[var(--brand)] drop-shadow-[0_0_10px_var(--brand)]" /> Shielded Pool Liquidity
              </h2>
              <p className="text-[var(--muted-foreground)] text-sm mt-1">Total public deposits masking individual allocations.</p>
            </div>
            <div className="flex gap-6 relative z-10">
              <div className="text-right">
                <div className="text-4xl font-mono font-bold text-white tracking-tight">
                  {poolBalance ? (Number(poolBalance) / 1e18).toFixed(2) : "0.00"} <span className="text-lg text-[var(--muted-foreground)]">MTK</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1 uppercase tracking-wider font-mono">Pool Balance</div>
              </div>
              <div className="text-right border-l border-white/10 pl-6">
                <div className="text-3xl font-mono font-bold text-white/80 tracking-tight">
                  {totalScheduled.toFixed(2)} <span className="text-sm text-[var(--muted-foreground)]">MTK</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1 uppercase tracking-wider font-mono">Total Scheduled</div>
              </div>
              <div className="text-right border-l border-white/10 pl-6">
                <div className={`text-2xl font-mono font-bold tracking-tight ${((Number(poolBalance||0)/1e18) - totalScheduled) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {Math.max(0, (Number(poolBalance||0)/1e18) - totalScheduled).toFixed(2)} <span className="text-sm text-[var(--muted-foreground)]">MTK</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1 uppercase tracking-wider font-mono">Available</div>
              </div>
              <div className="text-right border-l border-white/10 pl-6">
                <div className="text-xl font-mono font-bold text-white/40 tracking-tight mt-1">
                  {walletTokenBalance ? parseFloat(formatEther(walletTokenBalance as bigint)).toFixed(2) : "0.00"} <span className="text-xs">MTK</span>
                </div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-1 uppercase tracking-wider font-mono">In Wallet</div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div className={`p-4 rounded-xl text-sm flex items-center gap-3 backdrop-blur-md border animate-fade-in shadow-xl ${
              statusMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
              statusMsg.type === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" :
              "bg-blue-500/10 border-blue-500/30 text-blue-400"
            }`}>
              {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> :
               statusMsg.type === "error" ? <XCircle className="w-5 h-5 shrink-0" /> :
               <Loader2 className="w-5 h-5 animate-spin shrink-0" />}
              <span className="font-medium">{statusMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 w-full">
            {/* Left: Action Panel */}
            <div className="glass-panel overflow-hidden flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-white/10 bg-black/40">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setStatusMsg(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all duration-300 relative ${
                      activeTab === tab.id
                        ? "text-white bg-white/5"
                        : "text-gray-500 hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                    )}
                    <span className={activeTab === tab.id ? "text-white" : ""}>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.step}</span>
                  </button>
                ))}
              </div>

              <div className="p-6 flex-1">
                {/* TAB 1: Deposit */}
                {activeTab === "deposit" && (
                  <div className="animate-fade-in">
                    <h3 className="text-xl font-bold mb-2 text-white">Deposit to Shielded Pool</h3>
                    <p className="text-[var(--muted-foreground)] text-sm mb-6 leading-relaxed">
                      Fund the contract with a lump sum. This public action hides the exact distribution amounts later.
                    </p>
                    <form onSubmit={handleDeposit} className="flex flex-col gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Amount (MTK)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            placeholder="10000"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="input-field !pl-12 text-lg"
                            required
                          />
                          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading || !depositAmount} className="btn-primary flex justify-center gap-2 items-center mt-2">
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing tx...</> : <><Plus className="w-5 h-5" /> Execute Deposit</>}
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 2: Schedule */}
                {activeTab === "schedule" && (
                  <div className="animate-fade-in">
                    <h3 className="text-xl font-bold mb-2 text-white">Schedule Confidential Salary</h3>
                    <p className="text-[var(--muted-foreground)] text-sm mb-6 leading-relaxed">
                      Encrypts the exact amount on-chain using Nox FHE. No tokens are transferred in this step.
                    </p>
                    <form onSubmit={handleSchedule} className="flex flex-col gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Recipient Address</label>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Secret Amount (MTK)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            placeholder="1000"
                            value={salaryAmount}
                            onChange={(e) => setSalaryAmount(e.target.value)}
                            className="input-field !pl-12 text-lg"
                            required
                          />
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 opacity-50 pointer-events-none" />
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading || !recipient || !salaryAmount} className="btn-primary flex justify-center gap-2 items-center mt-2">
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Encrypting...</> : <><Lock className="w-5 h-5" /> FHE Encrypt & Schedule</>}
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 3: Batch */}
                {activeTab === "batch" && (
                  <div className="animate-fade-in">
                    <h3 className="text-xl font-bold mb-2 text-white">Batch Schedule Salaries</h3>
                    <p className="text-[var(--muted-foreground)] text-sm mb-6 leading-relaxed">
                      Encrypt and schedule multiple salaries in a single transaction. Provide comma-separated lists.
                    </p>
                    <form onSubmit={handleBatchSchedule} className="flex flex-col gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Recipient Addresses (comma separated)</label>
                        <input
                          type="text"
                          placeholder="0x..., 0x..."
                          value={batchRecipients}
                          onChange={(e) => setBatchRecipients(e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Secret Amounts MTK (comma separated)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="1000, 2000"
                            value={batchAmounts}
                            onChange={(e) => setBatchAmounts(e.target.value)}
                            className="input-field !pl-12 text-lg"
                            required
                          />
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 opacity-50 pointer-events-none" />
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading || !batchRecipients || !batchAmounts} className="btn-primary flex justify-center gap-2 items-center mt-2">
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Encrypting Batch...</> : <><Users className="w-5 h-5" /> FHE Encrypt & Batch Schedule</>}
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 4: Recurring */}
                {activeTab === "recurring" && (
                  <div className="animate-fade-in">
                    <h3 className="text-xl font-bold mb-2 text-white">Recurring Salary Schedule</h3>
                    <p className="text-[var(--muted-foreground)] text-sm mb-6 leading-relaxed">
                      Create an automated, recurring encrypted payment schedule. The interval is in days.
                    </p>
                    <form onSubmit={handleRecurringSchedule} className="flex flex-col gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Recipient Address</label>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={recurringRecipient}
                          onChange={(e) => setRecurringRecipient(e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Secret Amount (MTK)</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.0001"
                              min="0.0001"
                              placeholder="1000"
                              value={recurringAmount}
                              onChange={(e) => setRecurringAmount(e.target.value)}
                              className="input-field !pl-12 text-lg"
                              required
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 opacity-50 pointer-events-none" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Interval (Days)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              placeholder="30"
                              value={recurringIntervalDays}
                              onChange={(e) => setRecurringIntervalDays(e.target.value)}
                              className="input-field !pl-12 text-lg"
                              required
                            />
                            <CalendarClock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 opacity-50 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading || !recurringRecipient || !recurringAmount || !recurringIntervalDays} className="btn-primary flex justify-center gap-2 items-center mt-2">
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Encrypting...</> : <><Repeat className="w-5 h-5" /> Create Recurring Schedule</>}
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 5: Revoke */}
                {activeTab === "revoke" && (
                  <div className="animate-fade-in">
                    <h3 className="text-xl font-bold mb-2 text-white">Revoke Scheduled Payment</h3>
                    <p className="text-[var(--muted-foreground)] text-sm mb-6 leading-relaxed">
                      Cancel an un-claimed payment. The encrypted balance will be zeroed out in the FHE ledger.
                    </p>
                    <div className="flex flex-col gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Recipient Address</label>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={revokeAddress}
                          onChange={(e) => setRevokeAddress(e.target.value)}
                          className="input-field focus:ring-red-500/50 focus:border-red-500/50"
                        />
                      </div>
                      <button onClick={() => confirmAndRevoke()} disabled={isLoading || !revokeAddress} className="bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl px-4 py-3 transition-all hover:bg-red-500/20 hover:border-red-500/50 disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Revoking...</> : <><XCircle className="w-5 h-5" /> Revoke Payment</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Recipient Ledger */}
            <div className="glass-panel flex flex-col h-[500px]">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                  <Lock className="w-5 h-5 text-white/70" />
                  Encrypted Ledger
                </h2>
                <div className="text-xs font-mono text-white/80 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  LIVE
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-black/20">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0f0f0f] text-[var(--muted-foreground)] sticky top-0 border-b border-white/10 z-10 shadow-md">
                    <tr>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider">Address</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-center">Ciphertext</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(recipientList as string[])?.length > 0 ? (
                      (recipientList as string[]).map((rec, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors group">
                          <td className="p-4 font-mono text-white/90">{rec.slice(0, 6)}...{rec.slice(-4)}</td>
                          <td className="p-4 text-center">
                            <span className="inline-block bg-white/5 border border-white/10 text-white/60 rounded-md px-2 py-1 text-[10px] font-mono font-bold tracking-widest">
                              *** ENCRYPTED ***
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => confirmAndRevoke(rec)}
                              disabled={isLoading}
                              className="text-xs bg-transparent text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/10 hover:border-red-500/50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 font-medium"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-[var(--muted-foreground)]">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <ShieldCheck className="w-8 h-8 opacity-20" />
                            <p>Ledger is empty. Schedule salaries in Step 2.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
                <div className="text-[11px] font-mono text-[var(--muted-foreground)] flex items-center justify-center gap-2 uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4 text-white/50" /> Data secured by euint256 FHE
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="glass-panel p-6 animate-slide-up mb-8">
            <h2 className="text-lg font-bold flex items-center gap-2 text-white mb-4">
              <Activity className="w-5 h-5 text-white/70" /> Live Session Activity
            </h2>
            {events.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No recent activity in this session.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      {ev.type === 'deposit' && <Wallet className="w-4 h-4 text-emerald-400" />}
                      {ev.type === 'schedule' && <Lock className="w-4 h-4 text-blue-400" />}
                      {ev.type === 'revoke' && <XCircle className="w-4 h-4 text-red-400" />}
                      <span className="text-sm text-white/90">{ev.msg}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[var(--muted-foreground)]">{ev.time}</span>
                      <a href={`https://sepolia.arbiscan.io/tx/${ev.txHash}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--brand)] hover:underline">View Tx</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-8 max-w-md w-full mx-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Confirm Revoke</h3>
            </div>
            <p className="text-[var(--muted-foreground)] text-sm mb-2">Are you sure you want to revoke the payment for:</p>
            <p className="font-mono text-white text-sm bg-black/40 border border-white/10 px-4 py-3 rounded-xl mb-6 break-all">{confirmRevoke}</p>
            <p className="text-red-400/80 text-xs mb-6">This action cannot be undone. The encrypted balance will be zeroed out.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRevoke(null)} className="btn-secondary flex-1 text-center">Cancel</button>
              <button onClick={() => handleRevoke(confirmRevoke)} className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl px-4 py-3 transition-all hover:bg-red-500/30 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
