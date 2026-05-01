"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi";
import { parseEther } from "viem";
import ShadowRollABI from "../../ShadowRollABI.json";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2, ArrowRight, Lock, Unlock, CheckCircle2, XCircle, Wallet, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const CONTRACT_ADDRESS = ShadowRollABI.address as `0x${string}`;

export default function RecipientPage() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const isLoadingWallet = isConnecting || isReconnecting;

  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [hasClaimedOnce, setHasClaimedOnce] = useState(false);
  const [metadata, setMetadata] = useState<{ employer: string, time: string } | null>(null);

  const paymentScheduledAbi = [{
    type: 'event' as const,
    name: 'PaymentScheduled' as const,
    inputs: [
      { name: 'employer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
    ],
  }] as const;

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: paymentScheduledAbi,
    eventName: "PaymentScheduled",
    onLogs(logs) {
      logs.forEach(log => {
        if (log.args.recipient === address) {
          setMetadata({
            employer: log.args.employer as string,
            time: new Date().toLocaleTimeString()
          });
        }
      });
    }
  });

  // FIX RUNTIME-01: Use checkMySalary() instead of getRecipientList()
  // checkMySalary() has no access control — it only returns hasSalary[msg.sender]
  // We pass `account: address` so msg.sender is set correctly
  const { data: hasSalary, isLoading: isChecking } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ShadowRollABI.abi,
    functionName: "checkMySalary",
    account: address,
    query: { refetchInterval: 5000, enabled: !!address },
  });

  // FIX RUNTIME-02: Pass `account: address` so msg.sender = user's wallet
  // Without this, RPC calls set msg.sender = address(0) and the access control reverts
  const { refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ShadowRollABI.abi,
    functionName: "getEncryptedBalance",
    args: [address as `0x${string}`],
    account: address,
    query: { enabled: !!address },
  });

  const { writeContractAsync: unshieldFunds, isPending: isUnshielding, data: unshieldTxHash } = useWriteContract();

  const { isLoading: isWaitingForUnshield, isSuccess: isUnshieldSuccess } = useWaitForTransactionReceipt({
    hash: unshieldTxHash,
  });

  const isEligible = isConnected && hasSalary === true;

  const handleDecrypt = useCallback(async () => {
    setStatusMsg({ type: "info", text: "Decrypting balance locally..." });
    try {
      const { data: freshBalance } = await refetchBalance();
      if (freshBalance) {
        setDecryptedBalance((Number(freshBalance) / 1e18).toString());
        setStatusMsg(null);
      } else {
        setDecryptedBalance("0");
        setStatusMsg(null);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to decrypt balance. Please try again." });
    }
  }, [refetchBalance]);

  // FE-03 FIX: After successful unshield, refresh the balance and allow another unshield
  useEffect(() => {
    if (isUnshieldSuccess && !hasClaimedOnce) {
      setHasClaimedOnce(true);
      setStatusMsg({ type: "success", text: "Funds unshielded successfully!" });
      setWithdrawAmount("");
      // Refresh balance after a short delay to let the chain update
      const timer = setTimeout(async () => {
        const { data: freshBalance } = await refetchBalance();
        if (freshBalance) {
          const newBal = (Number(freshBalance) / 1e18).toString();
          setDecryptedBalance(newBal);
          if (parseFloat(newBal) === 0) {
            setDecryptedBalance(null);
          }
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnshieldSuccess]);

  // Auto-clear success message
  useEffect(() => {
    if (statusMsg?.type === "success") {
      const timer = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  const handleUnshield = async () => {
    if (!withdrawAmount) return;

    // FE-02 FIX: Validate amount doesn't exceed balance
    const maxAmount = parseFloat(decryptedBalance || "0");
    const requestedAmount = parseFloat(withdrawAmount);

    if (requestedAmount <= 0) {
      setStatusMsg({ type: "error", text: "Amount must be greater than zero." });
      return;
    }

    if (requestedAmount > maxAmount) {
      setStatusMsg({ type: "error", text: `Amount exceeds your balance of ${maxAmount} MTK.` });
      return;
    }

    setStatusMsg({ type: "info", text: "Executing partial unshield..." });
    setHasClaimedOnce(false); // Reset so useEffect fires for new tx

    try {
      const parsedAmount = parseEther(withdrawAmount);
      await unshieldFunds({
        address: CONTRACT_ADDRESS,
        abi: ShadowRollABI.abi,
        functionName: "unshield",
        args: [parsedAmount],
      });
    } catch (err: unknown) {
      // FE-01 FIX: Show error to user instead of just console.error
      const msg = err instanceof Error ? err.message : "Unshield failed";
      setStatusMsg({ type: "error", text: msg.length > 100 ? msg.substring(0, 100) + "..." : msg });
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl flex justify-between items-center mb-12 border-b border-white/10 pb-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:bg-white/10 transition-all">
            <Image src="/logo.png" alt="ShadowRoll Logo" width={40} height={40} className="object-contain" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Recipient Portal</h1>
            <p className="text-[var(--muted-foreground)] mt-1 font-mono text-xs uppercase tracking-widest opacity-70">Claim Salary Securely</p>
          </div>
        </div>
        <ConnectButton />
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={`w-full max-w-xl mb-6 p-4 rounded-xl text-sm flex items-center gap-3 backdrop-blur-md border animate-fade-in shadow-xl ${
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

      {isLoadingWallet ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-12 w-full max-w-xl animate-fade-in opacity-50">
          <Loader2 className="w-12 h-12 animate-spin text-white mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
          <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">Detecting Wallet...</h2>
        </div>
      ) : !isConnected ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-12 w-full max-w-xl animate-slide-up">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <Wallet className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">Connect Wallet</h2>
          <p className="text-[var(--muted-foreground)] mb-8">Connect your wallet to check if you have an active salary available for claim.</p>
          <ConnectButton />
        </div>
      ) : isChecking ? (
        <div className="flex flex-col items-center justify-center py-20 text-center w-full max-w-xl animate-fade-in">
          <Loader2 className="w-12 h-12 animate-spin text-white mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
          <p className="text-[var(--muted-foreground)] font-mono text-sm tracking-widest uppercase">Scanning TEE Enclave...</p>
        </div>
      ) : isEligible ? (
        <div className="glass-panel p-10 flex flex-col items-center text-center w-full max-w-xl animate-slide-up relative overflow-hidden group">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-white opacity-[0.01] rounded-full blur-[100px] pointer-events-none group-hover:opacity-[0.03] transition-opacity duration-700" />
          
          <div className="relative z-10 w-full flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Lock className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2 text-white">Shielded Balance Available</h2>
            {metadata && (
              <div className="text-xs font-mono text-emerald-400 mb-3 border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 rounded-full animate-fade-in">
                Last Scheduled By: {metadata.employer.slice(0,6)}...{metadata.employer.slice(-4)} at {metadata.time}
              </div>
            )}
            <p className="text-[var(--muted-foreground)] mb-8 text-sm">
              You have a confidential balance. Your total salary remains hidden from the public on-chain.
            </p>

            {!decryptedBalance ? (
              <button 
                onClick={handleDecrypt}
                className="btn-secondary w-full flex items-center justify-center gap-3 text-lg py-4 mb-4 hover:border-white/30 group"
              >
                <Unlock className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all" /> 
                <span>Decrypt Balance Locally</span>
              </button>
            ) : (
              <div className="w-full text-left mb-8 bg-black/40 border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10"><Shield className="w-16 h-16" /></div>
                <div className="text-xs text-[var(--muted-foreground)] mb-2 font-mono uppercase tracking-widest relative z-10">Decrypted Balance</div>
                <div className="text-4xl font-bold font-mono text-white tracking-tight relative z-10">
                  {decryptedBalance} <span className="text-lg text-[var(--muted-foreground)]">MTK</span>
                </div>
              </div>
            )}

            {decryptedBalance && parseFloat(decryptedBalance) > 0 && (
              <div className="w-full flex flex-col gap-4">
                <div className="text-left">
                  <label className="block text-xs font-mono tracking-widest uppercase text-[var(--muted-foreground)] mb-2">Amount to Unshield</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.0001"
                      min="0.0001"
                      max={decryptedBalance}
                      placeholder="Enter amount..." 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="input-field !pl-12 text-lg"
                    />
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
                  </div>
                  {/* Show max button */}
                  <button 
                    onClick={() => setWithdrawAmount(decryptedBalance)}
                    className="text-xs text-white/50 hover:text-white mt-2 font-mono transition-colors"
                  >
                    MAX: {decryptedBalance} MTK
                  </button>
                </div>

                <button 
                  onClick={handleUnshield}
                  disabled={isUnshielding || isWaitingForUnshield || !withdrawAmount}
                  className="btn-primary w-full flex items-center justify-center gap-3 text-lg py-4 mt-2"
                >
                  {(isUnshielding || isWaitingForUnshield) ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Unshielding...</>
                  ) : (
                    <><Shield className="w-5 h-5" /> Execute Partial Unshield</>
                  )}
                </button>
              </div>
            )}

            {isUnshieldSuccess && unshieldTxHash && (
              <div className="mt-6 p-5 w-full bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col items-center gap-4 animate-fade-in">
                <span className="text-sm text-emerald-400 font-medium">Funds unshielded successfully.</span>
                <a 
                  href={`https://sepolia.arbiscan.io/tx/${unshieldTxHash}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs bg-black/40 text-white/80 border border-white/10 px-5 py-3 rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 font-mono break-all text-center w-full justify-center group"
                >
                  View on Arbiscan <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-12 w-full max-w-xl animate-fade-in border-dashed border-white/10">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
             <Lock className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white/50">No Pending Payments</h2>
          <p className="text-[var(--muted-foreground)] text-sm">Your connected wallet address does not have any active confidential salaries scheduled in the TEE ledger.</p>
        </div>
      )}
    </main>
  );
}
