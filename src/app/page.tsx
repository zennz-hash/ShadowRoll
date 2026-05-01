import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Briefcase, Wallet, Lock, Eye, EyeOff, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--background)]">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[var(--brand-glow)] blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none opacity-50" />
      
      <div className="z-10 w-full max-w-5xl items-center justify-center flex flex-col gap-10 px-6 text-center animate-slide-up">
        
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[var(--foreground)] tracking-wide shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse shadow-[0_0_10px_var(--brand)]" />
          SHADOWROLL IS LIVE ON SEPOLIA
        </div>

        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center gap-6 mt-4">
          <Image src="/logo.png" alt="ShadowRoll Logo" width={90} height={90} className="object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-sm pb-2">
            ShadowRoll
          </h1>
        </div>
        
        <p className="max-w-[700px] text-lg sm:text-xl text-[var(--muted-foreground)] leading-relaxed font-light">
          Confidential DeFi payroll infrastructure. Employee salaries are encrypted using <span className="font-semibold text-white">iExec Nox TEE</span> and stored on <span className="font-semibold text-white">Arbitrum</span>.
        </p>

        {/* Connect Button Container */}
        <div className="mt-4 flex justify-center glass p-3 rounded-2xl">
          <ConnectButton />
        </div>

        {/* Portals */}
        <div className="mt-8 flex flex-col sm:flex-row gap-6 w-full max-w-3xl justify-center">
          <Link href="/employer" className="flex-1 group">
            <div className="glass-panel p-8 h-full transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_10px_40px_rgba(255,255,255,0.05)] text-left flex flex-col">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2 group-hover:text-[var(--brand)] transition-colors">
                Employer Portal <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">Deposit funds to the shielded pool and schedule stealth payments for your team.</p>
            </div>
          </Link>

          <Link href="/recipient" className="flex-1 group">
            <div className="glass-panel p-8 h-full transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_10px_40px_rgba(255,255,255,0.05)] text-left flex flex-col">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2 group-hover:text-[var(--brand)] transition-colors">
                Recipient Portal <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">Decrypt your confidential balance locally and execute partial unshielding.</p>
            </div>
          </Link>
        </div>

        {/* Privacy Explainer Section */}
        <div className="mt-16 w-full max-w-4xl text-left">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-[var(--brand)]" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Zero-Knowledge Payroll Matrix</h2>
          </div>
          
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="p-5 font-semibold text-white">Action</th>
                  <th className="p-5 font-semibold text-white text-center">Visible on Arbiscan</th>
                  <th className="p-5 font-semibold text-[var(--brand)] text-center text-glow">Protected by Nox TEE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 font-medium text-white/90">Pool Funding</td>
                  <td className="p-5 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-full">
                      <Eye className="w-3.5 h-3.5 opacity-70" /> Total Deposit
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-[var(--brand-glow)] text-[var(--brand)] border border-[var(--brand)]/20 px-3 py-1.5 rounded-full shadow-[0_0_10px_var(--brand-glow)]">
                      <EyeOff className="w-3.5 h-3.5" /> Employee Allocations
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 font-medium text-white/90">Salary Schedule</td>
                  <td className="p-5 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-full">
                      <Eye className="w-3.5 h-3.5 opacity-70" /> Wallet Addresses
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-[var(--brand-glow)] text-[var(--brand)] border border-[var(--brand)]/20 px-3 py-1.5 rounded-full shadow-[0_0_10px_var(--brand-glow)]">
                      <Lock className="w-3.5 h-3.5" /> Exact Payment Amount
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 font-medium text-white/90">Partial Unshield</td>
                  <td className="p-5 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-full">
                      <Eye className="w-3.5 h-3.5 opacity-70" /> Withdrawal Size
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-[var(--brand-glow)] text-[var(--brand)] border border-[var(--brand)]/20 px-3 py-1.5 rounded-full shadow-[0_0_10px_var(--brand-glow)]">
                      <EyeOff className="w-3.5 h-3.5" /> Total Salary Remaining
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-[var(--muted-foreground)] font-mono tracking-wider opacity-60">
              BUILT ON &lt;euint256&gt; ARCHITECTURE // POWERED BY IEXEC
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
