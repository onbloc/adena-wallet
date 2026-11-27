import { AdenaStorage } from '@common/storage';
import { WalletRepository } from '@repositories/wallet';

// What the agent policy and grants are encrypted with: the wallet password
// and its Argon2id salt, so the stored ciphertext is no easier to attack than
// the vault itself.
export interface AgentPolicyKey {
  password: string;
  salt: Uint8Array;
}

// Resolves the key from the unlocked session in extension pages (the popup).
// The background has no channel to itself here and resolves null; it builds
// the key through InjectCore.getAgentPolicyKey instead.
export const resolveAgentPolicyKey = async (): Promise<AgentPolicyKey | null> => {
  try {
    const repository = new WalletRepository(AdenaStorage.local(), AdenaStorage.session());
    const [password, salt] = await Promise.all([
      repository.getWalletPassword(),
      repository.getKdfSalt(),
    ]);
    return password && salt ? { password, salt } : null;
  }
  catch {
    return null;
  }
};
