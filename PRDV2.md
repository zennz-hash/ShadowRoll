# Product Requirements Document (PRD)
**Project Name:** ShadowRoll (V2 - Shielded Pool Architecture)
**Original Codename:** PrivaPay
**Track:** Confidential DeFi + Institutional[cite: 1]
**Infrastructure:** iExec Nox (FHE/TEE), Arbitrum Sepolia Testnet, Hardhat, Next.js 14[cite: 1]

## 1. Executive Summary
ShadowRoll V2 adalah pivot dari arsitektur "Direct Transfer" menjadi "Shielded Pool". Masalah pada V1 adalah terjadinya kebocoran privasi nominal saat token dieksekusi keluar melalui event ERC-20 standar. Solusinya: ShadowRoll akan menahan token ERC-20 di dalam contract, sementara hak kepemilikan dicatat menggunakan ledger internal berbasis FHE (Fully Homomorphic Encryption) dari iExec Nox[cite: 1]. Penerima dapat melakukan penarikan dana (unshield/withdraw) secara parsial, sehingga nominal total gaji mereka tetap menjadi rahasia kriptografis.

## 2. Smart Contract Architecture (`ShadowRoll.sol`)
Contract tidak lagi melakukan transfer langsung ke recipient saat claim. Gunakan Nox Library untuk operasi matematika terenkripsi (tipe data `euint`)[cite: 1].

### 2.1 State Variables
*   `mapping(address => euint) private encryptedBalances;` -> Menyimpan saldo rahasia tiap karyawan.
*   `address public tokenAddress;` -> Address dari ERC-20 token (misal: Mock USDC/MTK).

### 2.2 Core Functions
*   **`fundPool(uint256 totalAmount)`**
    *   **Aktor:** Employer.
    *   **Logika:** Employer mendepositkan sejumlah token ERC-20 ke dalam pool contract. Ini adalah modal awal.
*   **`schedulePayment(address recipient, euint encryptedAmount)`**
    *   **Aktor:** Employer.
    *   **Logika:** Employer menetapkan gaji karyawan. Nilai `encryptedAmount` diproses di dalam TEE[cite: 1]. Contract TIDAK memindahkan token, melainkan HANYA menambahkan nilai `encryptedAmount` ke dalam `encryptedBalances[recipient]`.
*   **`unshield(euint amountToWithdraw)`**
    *   **Aktor:** Recipient (Karyawan).
    *   **Logika:** Karyawan memutuskan untuk mencairkan sebagian (atau seluruh) saldo rahasianya. Contract memverifikasi caller, mengurangi `encryptedBalances[caller]` dengan nilai `amountToWithdraw`, lalu memanggil fungsi `IERC20.transfer(caller, decryptedAmount)`.
    *   **Dampak Privasi:** Publik di Arbiscan hanya melihat nominal yang dicairkan, bukan total gaji yang ada di dalam pool.
*   **`getRecipientList()`**
    *   **Aktor:** Employer.
    *   **Logika:** Return list address karyawan tanpa mengekspos nominal `euint` mereka[cite: 1].

## 3. Frontend / UI Requirements (Next.js 14 App Router)
Gunakan wagmi v2, viem, dan Tailwind CSS (Dark Mode/Terminal Aesthetic)[cite: 1]. Semua hook on-chain wajib berjalan dengan direktif `"use client"`.

### 3.1 /employer Page
*   **Pool Status:** Menampilkan total saldo ERC-20 yang ada di dalam smart contract (public liquidity).
*   **Deposit Form:** Form untuk memanggil `fundPool`.
*   **Schedule Form:** Input Wallet Address dan Salary Amount. Wagmi akan mengenkripsi input ini menggunakan SDK/Nox sebelum mengirimkannya sebagai parameter `euint` ke fungsi `schedulePayment`[cite: 1].
*   **Ledger Table:** Tabel yang menampilkan daftar alamat yang sudah dijadwalkan, DENGAN nominal yang disensor (misal diganti menjadi string `[ ENCRYPTED BY NOX ]`).

### 3.2 /recipient Page
*   **Shielded Balance Dashboard:** UI tidak boleh langsung menampilkan angka. Harus ada tombol "Decrypt Balance" yang mengharuskan user melakukan sign message dengan wallet mereka untuk mendekripsi saldo mereka secara lokal di browser.
*   **Withdrawal (Unshield) Form:** Input nominal yang ingin ditarik ke wallet (harus lebih kecil atau sama dengan saldo internal).
*   **Action Button:** Tombol "Unshield Funds" yang memicu fungsi `unshield`.
*   **Success State:** Menampilkan hash transaksi (link ke Arbiscan)[cite: 1] dan notifikasi: "Funds unshielded. Your remaining balance is still encrypted."

## 4. Development & Deployment Workflow
1.  **Contract:** Compile dengan Hardhat, deploy ke Arbitrum Sepolia[cite: 1]. Wajib simpan ABI dan Address ke dalam directory frontend.
2.  **Mock Token:** Deploy dummy ERC-20 (e.g., MTK) di testnet untuk keperluan testing.
3.  **UI Integration:** Sambungkan ABI dengan instance wagmi.
4.  **Testing:** Simulasikan employer set gaji 1000 MTK. Simulasikan recipient mencairkan 200 MTK. Pastikan di Arbiscan HANYA tercatat transfer 200 MTK, sementara sisa 800 MTK tidak dapat di-reverse engineer oleh publik.