/**
 * ShadowRoll FHE Service Layer (v1.0)
 * 
 * Abstraction layer for iExec Nox Fully Homomorphic Encryption.
 * Currently uses a mock implementation for testnet.
 * When the real iExec Nox SDK becomes available, replace the
 * `MockFHEProvider` with `IExecNoxProvider` — zero frontend changes needed.
 */

import { encodeAbiParameters, parseAbiParameters } from "viem";

// === FHE Provider Interface ===
export interface FHEProvider {
  name: string;
  encrypt(plaintext: bigint): Promise<`0x${string}`>;
  decrypt(ciphertext: `0x${string}`): Promise<bigint>;
  add(a: `0x${string}`, b: `0x${string}`): Promise<`0x${string}`>;
  sub(a: `0x${string}`, b: `0x${string}`): Promise<`0x${string}`>;
}

// === Mock Provider (Current Testnet Implementation) ===
class MockFHEProvider implements FHEProvider {
  name = "Nox FHE Mock (Testnet)";

  async encrypt(plaintext: bigint): Promise<`0x${string}`> {
    // ABI-encode the uint256 value as bytes (matches NoxLibrary.sol mock)
    return encodeAbiParameters(
      parseAbiParameters("uint256"),
      [plaintext]
    );
  }

  async decrypt(ciphertext: `0x${string}`): Promise<bigint> {
    // In mock mode, the "ciphertext" is just ABI-encoded plaintext
    // Real FHE would require TEE decryption via iExec
    const value = BigInt(ciphertext);
    return value;
  }

  async add(a: `0x${string}`, b: `0x${string}`): Promise<`0x${string}`> {
    const va = BigInt(a);
    const vb = BigInt(b);
    return encodeAbiParameters(
      parseAbiParameters("uint256"),
      [va + vb]
    );
  }

  async sub(a: `0x${string}`, b: `0x${string}`): Promise<`0x${string}`> {
    const va = BigInt(a);
    const vb = BigInt(b);
    return encodeAbiParameters(
      parseAbiParameters("uint256"),
      [va - vb]
    );
  }
}

// === iExec Nox Provider (Production — Placeholder) ===
// Uncomment and implement when iExec Nox SDK is available:
//
// import { IExecDataProtector } from "@iexec/dataprotector";
//
// class IExecNoxProvider implements FHEProvider {
//   name = "iExec Nox FHE (Production)";
//   private protector: IExecDataProtector;
//
//   constructor() {
//     this.protector = new IExecDataProtector(window.ethereum);
//   }
//
//   async encrypt(plaintext: bigint): Promise<`0x${string}`> {
//     const result = await this.protector.protectData({
//       data: { salary: plaintext.toString() },
//       name: `salary_${Date.now()}`,
//     });
//     return result.address as `0x${string}`;
//   }
//
//   async decrypt(ciphertext: `0x${string}`): Promise<bigint> {
//     const result = await this.protector.fetchProtectedData({
//       protectedData: ciphertext,
//     });
//     return BigInt(result.salary);
//   }
//
//   async add(a: `0x${string}`, b: `0x${string}`): Promise<`0x${string}`> {
//     // FHE homomorphic addition via iExec TEE
//     throw new Error("Homomorphic add requires TEE execution");
//   }
//
//   async sub(a: `0x${string}`, b: `0x${string}`): Promise<`0x${string}`> {
//     throw new Error("Homomorphic sub requires TEE execution");
//   }
// }

// === Singleton Service ===
class FHEService {
  private provider: FHEProvider;

  constructor() {
    // Switch provider here when moving to production:
    // this.provider = new IExecNoxProvider();
    this.provider = new MockFHEProvider();
  }

  getProviderName(): string {
    return this.provider.name;
  }

  async encryptSalary(amountWei: bigint): Promise<`0x${string}`> {
    return this.provider.encrypt(amountWei);
  }

  async decryptBalance(ciphertext: `0x${string}`): Promise<bigint> {
    return this.provider.decrypt(ciphertext);
  }

  async homomorphicAdd(a: `0x${string}`, b: `0x${string}`): Promise<`0x${string}`> {
    return this.provider.add(a, b);
  }

  async homomorphicSub(a: `0x${string}`, b: `0x${string}`): Promise<`0x${string}`> {
    return this.provider.sub(a, b);
  }
}

// Export singleton instance
export const fheService = new FHEService();
export default fheService;
