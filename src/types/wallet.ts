export interface WalletAccount {
  id: string;
  name: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: number;
  avatar?: string;
}

export interface WalletState {
  accounts: WalletAccount[];
  currentAccountId: string | null;
  isLocked: boolean;
  network: 'mainnet' | 'devnet';
}

export interface Transaction {
  signature: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  type: 'send' | 'receive';
}

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  logoURI?: string;
}