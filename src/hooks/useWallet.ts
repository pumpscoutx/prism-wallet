import { useState, useEffect, useCallback } from 'react';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { WalletAccount, WalletState, TokenBalance } from '../types/wallet';
import { StorageUtils } from '../utils/storage';
import { CryptoUtils } from '../utils/crypto';
import { SolanaUtils } from '../utils/solana';
import bs58 from 'bs58';

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    accounts: [],
    currentAccountId: null,
    isLocked: true,
    network: 'devnet'
  });
  const [password, setPassword] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [polling, setPolling] = useState<number | null>(null);

  const loadWalletState = useCallback(async () => {
    const savedState = await StorageUtils.get<WalletState>('walletState');
    if (savedState) {
      setWalletState(savedState);
    }
  }, []);

  const saveWalletState = useCallback(async (state: WalletState) => {
    await StorageUtils.set('walletState', state);
    setWalletState(state);
  }, []);

  const createWallet = useCallback(async (walletPassword: string, accountName: string): Promise<string> => {
    try {
      setLoading(true);
      
      // Generate mnemonic
      const mnemonic = bip39.generateMnemonic();
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      
      // Encrypt private key
      const encryptedPrivateKey = CryptoUtils.encrypt(
        Buffer.from(keypair.secretKey).toString('hex'),
        walletPassword
      );
      
      const account: WalletAccount = {
        id: Date.now().toString(),
        name: accountName,
        publicKey: keypair.publicKey.toString(),
        encryptedPrivateKey,
        createdAt: Date.now(),
      };
      
      const newState: WalletState = {
        accounts: [account],
        currentAccountId: account.id,
        isLocked: false,
        network: walletState.network
      };
      
      await saveWalletState(newState);
      setPassword(walletPassword);
      
      return mnemonic;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    } finally {
      setLoading(false);
    }
  }, [walletState.network, saveWalletState]);

  const importWallet = useCallback(async (
    mnemonic: string, 
    walletPassword: string, 
    accountName: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }
      
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      
      const encryptedPrivateKey = CryptoUtils.encrypt(
        Buffer.from(keypair.secretKey).toString('hex'),
        walletPassword
      );
      
      const account: WalletAccount = {
        id: Date.now().toString(),
        name: accountName,
        publicKey: keypair.publicKey.toString(),
        encryptedPrivateKey,
        createdAt: Date.now(),
      };
      
      const newState: WalletState = {
        accounts: [...walletState.accounts, account],
        currentAccountId: account.id,
        isLocked: false,
        network: walletState.network
      };
      
      await saveWalletState(newState);
      setPassword(walletPassword);
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [walletState, saveWalletState]);

  const unlockWallet = useCallback(async (walletPassword: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Try to decrypt the first account to verify password
      if (walletState.accounts.length > 0) {
        const account = walletState.accounts[0];
        CryptoUtils.decrypt(account.encryptedPrivateKey, walletPassword);
        
        setPassword(walletPassword);
        await saveWalletState({
          ...walletState,
          isLocked: false
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [walletState, saveWalletState]);

  const lockWallet = useCallback(async () => {
    setPassword('');
    await saveWalletState({
      ...walletState,
      isLocked: true
    });
  }, [walletState, saveWalletState]);

  const refreshBalances = useCallback(async () => {
    if (!walletState.currentAccountId || walletState.isLocked) return;
    
    try {
      setLoading(true);
      const currentAccount = walletState.accounts.find(acc => acc.id === walletState.currentAccountId);
      
      if (currentAccount) {
        const [solBalance, tokens] = await Promise.all([
          SolanaUtils.getBalance(currentAccount.publicKey, walletState.network),
          SolanaUtils.getTokenBalances(currentAccount.publicKey, walletState.network)
        ]);
        
        setBalance(solBalance);
        setTokenBalances(tokens);
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      setLoading(false);
    }
  }, [walletState]);

  const refreshRecentTransactions = useCallback(async () => {
    if (!walletState.currentAccountId || walletState.isLocked) return;
    try {
      const currentAccount = walletState.accounts.find(acc => acc.id === walletState.currentAccountId);
      if (currentAccount) {
        const txs = await SolanaUtils.getRecentTransactions(currentAccount.publicKey, walletState.network, 20);
        setRecentTransactions(txs);
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
    }
  }, [walletState]);

  const sendSOL = useCallback(async (toAddress: string, amountSOL: number): Promise<string> => {
    if (!walletState.currentAccountId || walletState.isLocked) throw new Error('Wallet is locked');
    const currentAccount = walletState.accounts.find(acc => acc.id === walletState.currentAccountId);
    if (!currentAccount) throw new Error('No current account');
    try {
      setLoading(true);
      const decryptedHex = CryptoUtils.decrypt(currentAccount.encryptedPrivateKey, password);
      if (!decryptedHex) throw new Error('Incorrect password');
      const secretKey = CryptoUtils.hexToUint8Array(decryptedHex);
      const keypair = Keypair.fromSecretKey(secretKey);
      const sig = await SolanaUtils.sendTransaction(keypair, toAddress, amountSOL, walletState.network);
      await refreshBalances();
      await refreshRecentTransactions();
      return sig;
    } finally {
      setLoading(false);
    }
  }, [walletState, password, refreshBalances, refreshRecentTransactions]);

  const swapTokens = useCallback(async (
    inputMint: string,
    outputMint: string,
    amountUi: number,
    inputDecimals: number,
    slippageBps = 100
  ): Promise<string> => {
    if (!walletState.currentAccountId || walletState.isLocked) throw new Error('Wallet is locked');
    const currentAccount = walletState.accounts.find(acc => acc.id === walletState.currentAccountId);
    if (!currentAccount) throw new Error('No current account');
    try {
      setLoading(true);
      const decryptedHex = CryptoUtils.decrypt(currentAccount.encryptedPrivateKey, password);
      if (!decryptedHex) throw new Error('Incorrect password');
      const secretKey = CryptoUtils.hexToUint8Array(decryptedHex);
      const keypair = Keypair.fromSecretKey(secretKey);
      const amountInAtomic = Math.round(amountUi * Math.pow(10, inputDecimals));
      const sig = await SolanaUtils.swapViaJupiter(keypair, inputMint, outputMint, amountInAtomic, slippageBps, walletState.network);
      await refreshBalances();
      await refreshRecentTransactions();
      return sig;
    } finally {
      setLoading(false);
    }
  }, [walletState, password, refreshBalances, refreshRecentTransactions]);

  const switchNetwork = useCallback(async (network: 'mainnet' | 'devnet') => {
    await saveWalletState({
      ...walletState,
      network
    });
  }, [walletState, saveWalletState]);

  const getCurrentAccount = useCallback(() => {
    return walletState.accounts.find(acc => acc.id === walletState.currentAccountId) || null;
  }, [walletState]);

  const selectAccount = useCallback(async (accountId: string) => {
    await saveWalletState({
      ...walletState,
      currentAccountId: accountId
    });
    await refreshBalances();
    await refreshRecentTransactions();
  }, [walletState, saveWalletState, refreshBalances, refreshRecentTransactions]);

  const airdropDevnet = useCallback(async (amountSol: number) => {
    if (walletState.network !== 'devnet') throw new Error('Airdrop available on Devnet only');
    const acc = getCurrentAccount();
    if (!acc) throw new Error('No account');
    const sig = await SolanaUtils.requestAirdrop(acc.publicKey, amountSol);
    await refreshBalances();
    await refreshRecentTransactions();
    return sig;
  }, [walletState.network, getCurrentAccount, refreshBalances, refreshRecentTransactions]);

  const exportSecretKey = useCallback(() => {
    const acc = getCurrentAccount();
    if (!acc) throw new Error('No account');
    if (!password) throw new Error('Wallet locked or password not set');
    const hex = CryptoUtils.decrypt(acc.encryptedPrivateKey, password);
    if (!hex) throw new Error('Incorrect password');
    const secret = CryptoUtils.hexToUint8Array(hex);
    return bs58.encode(secret);
  }, [getCurrentAccount, password]);

  // NOTE: We did not persist mnemonic by design for security. Implementing exportMnemonic would require storing it securely during create/import.
  const exportMnemonic = useCallback(() => {
    throw new Error('Mnemonic export not available. It is not stored for security reasons.');
  }, []);

  const importPrivateKey = useCallback(async (
    privateKeyInput: string,
    walletPassword: string,
    accountName: string
  ): Promise<void> => {
    try {
      setLoading(true);
      const trimmed = privateKeyInput.trim();
      let secretBytes: Uint8Array | null = null;

      // JSON array format
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const arr = JSON.parse(trimmed) as number[];
        secretBytes = new Uint8Array(arr);
      } else if (/^[0-9a-fA-F]+$/.test(trimmed)) {
        // hex format
        secretBytes = CryptoUtils.hexToUint8Array(trimmed);
      } else {
        // assume base58
        secretBytes = bs58.decode(trimmed);
      }

      if (!(secretBytes instanceof Uint8Array)) {
        throw new Error('Invalid secret key format');
      }

      let keypair: Keypair;
      if (secretBytes.length === 64) {
        keypair = Keypair.fromSecretKey(secretBytes);
      } else if (secretBytes.length === 32) {
        keypair = Keypair.fromSeed(secretBytes);
      } else {
        throw new Error('Secret key must be 32 or 64 bytes');
      }

      const encryptedPrivateKey = CryptoUtils.encrypt(Buffer.from(keypair.secretKey).toString('hex'), walletPassword);

      const account: WalletAccount = {
        id: Date.now().toString(),
        name: accountName,
        publicKey: keypair.publicKey.toString(),
        encryptedPrivateKey,
        createdAt: Date.now(),
      };

      const newState: WalletState = {
        accounts: [...walletState.accounts, account],
        currentAccountId: account.id,
        isLocked: false,
        network: walletState.network
      };

      await saveWalletState(newState);
      setPassword(walletPassword);
    } catch (error) {
      console.error('Error importing private key:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [walletState, saveWalletState]);

  // Account management
  const renameAccount = useCallback(async (accountId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updatedAccounts = walletState.accounts.map(acc => acc.id === accountId ? { ...acc, name: trimmed } : acc);
    await saveWalletState({
      ...walletState,
      accounts: updatedAccounts
    });
  }, [walletState, saveWalletState]);

  const removeAccount = useCallback(async (accountId: string) => {
    const remaining = walletState.accounts.filter(acc => acc.id !== accountId);
    let newCurrentId = walletState.currentAccountId;
    if (walletState.currentAccountId === accountId) {
      newCurrentId = remaining.length > 0 ? remaining[0].id : null;
    }
    await saveWalletState({
      ...walletState,
      accounts: remaining,
      currentAccountId: newCurrentId,
      // If no accounts remain, lock the wallet
      isLocked: remaining.length === 0 ? true : walletState.isLocked
    });
  }, [walletState, saveWalletState]);

  useEffect(() => {
    loadWalletState();
  }, [loadWalletState]);

  useEffect(() => {
    refreshBalances();
    refreshRecentTransactions();
  }, [refreshBalances]);

  // Simple polling to auto-refresh every 20s when unlocked
  useEffect(() => {
    if (!walletState.isLocked && walletState.currentAccountId) {
      const id = window.setInterval(() => {
        refreshBalances();
        refreshRecentTransactions();
      }, 20000);
      setPolling(id);
      return () => { if (id) window.clearInterval(id); };
    }
    if (polling) {
      window.clearInterval(polling);
      setPolling(null);
    }
  }, [walletState.isLocked, walletState.currentAccountId, refreshBalances, refreshRecentTransactions]);

  return {
    walletState,
    password,
    balance,
    tokenBalances,
    recentTransactions,
    loading,
    createWallet,
    importWallet,
    importPrivateKey,
    unlockWallet,
    lockWallet,
    refreshBalances,
    refreshRecentTransactions,
    sendSOL,
    swapTokens,
    airdropDevnet,
    exportSecretKey,
    exportMnemonic,
    switchNetwork,
    getCurrentAccount,
    selectAccount,
    renameAccount,
    removeAccount
  };
};