import React, { useState, useEffect } from 'react';
import { Copy, Send, RefreshCw, LogOut, Globe, Eye, EyeOff, KeyRound, Droplets, Plus, Settings, Shuffle, ChevronDown, Search, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { WalletAccount, TokenBalance } from '../types/wallet';
import { QRCodeCanvas } from 'qrcode.react';
import { getAllTokens, searchTokens, KnownToken, getSwapQuote, fetchTokenPrices, TokenPrice, SwapQuote } from '../data/tokens';

interface WalletDashboardProps {
  account: WalletAccount;
  accounts?: WalletAccount[];
  currentAccountId?: string | null;
  balance: number;
  tokenBalances: TokenBalance[];
  network: 'mainnet' | 'devnet';
  loading: boolean;
  onRefresh: () => void;
  onLockWallet: () => void;
  onSwitchNetwork: (network: 'mainnet' | 'devnet') => void;
  onSendSOL: (to: string, amount: number) => Promise<string>;
  onSelectAccount?: (id: string) => void;
  recentTransactions?: Array<{ signature: string; timestamp: number; status: string }>
  onEstimateFee?: (from: string, to: string) => Promise<number>;
  onAirdrop?: (amount: number) => Promise<string>;
  onExportSecretKey?: (passwordConfirm: string) => string | Promise<string>;
  onImportPrivateKey?: (secret: string, password: string, accountName: string) => Promise<void>;
  onSwap?: (inputMint: string, outputMint: string, amountUi: number, inputDecimals: number, slippageBps?: number) => Promise<string>;
  onStartCreateWallet?: () => void;
  onRenameAccount?: (accountId: string, newName: string) => Promise<void> | void;
  onRemoveAccount?: (accountId: string) => Promise<void> | void;
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({
  account,
  accounts = [],
  currentAccountId = null,
  balance,
  tokenBalances,
  network,
  loading,
  onRefresh,
  onLockWallet,
  onSwitchNetwork,
  onSendSOL,
  onSelectAccount,
  recentTransactions = [],
  onEstimateFee,
  onAirdrop,
  onExportSecretKey,
  onImportPrivateKey,
  onSwap,
  onStartCreateWallet,
  onRenameAccount,
  onRemoveAccount,
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'tokens' | 'activity'>('tokens');
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImportPk, setShowImportPk] = useState(false);
  const [showRpc, setShowRpc] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSig, setSendSig] = useState('');
  const [feeEstimate, setFeeEstimate] = useState<number | null>(null);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [exportError, setExportError] = useState('');
  const [exportSk, setExportSk] = useState('');
  const [importPkValue, setImportPkValue] = useState('');
  const [importPkName, setImportPkName] = useState('Imported Account');
  const [importPkPass, setImportPkPass] = useState('');
  const [rpcMainnet, setRpcMainnet] = useState<string>('');
  const [rpcDevnet, setRpcDevnet] = useState<string>('');
  const [swapInputMint, setSwapInputMint] = useState('So11111111111111111111111111111111111111112');
  const [swapOutputMint, setSwapOutputMint] = useState('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDecimals, setSwapDecimals] = useState('9');
  const [swapSig, setSwapSig] = useState<string>('');
  const [swapError, setSwapError] = useState<string>('');

  // Manage accounts state
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState('');

  // Enhanced swap state
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [slippageBps, setSlippageBps] = useState(100); // 1% default
  const [tokenPrices, setTokenPrices] = useState<{ [mint: string]: TokenPrice }>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [swapPreview, setSwapPreview] = useState<{
    inputValue: number;
    outputValue: number;
    priceImpact: number;
    fee: number;
    exchangeRate: number;
  } | null>(null);
  const [isSwitchingTokens, setIsSwitchingTokens] = useState(false);
  const [showSwitchSuccess, setShowSwitchSuccess] = useState(false);

  const [showInputTokenDropdown, setShowInputTokenDropdown] = useState(false);
  const [showOutputTokenDropdown, setShowOutputTokenDropdown] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<KnownToken[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<KnownToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  const findToken = (mint: string): KnownToken | undefined => 
    availableTokens.find(t => t.mint === mint);

  // Enhanced price fetching with Jupiter API
  const fetchPrices = async () => {
    if (network !== 'mainnet') return; // Only fetch prices on mainnet
    
    const mints = [swapInputMint, swapOutputMint].filter(mint => mint && mint !== '');
    if (mints.length === 0) return;
    
    // Check if we already have recent prices (less than 15 seconds old for real-time data)
    const now = Date.now();
    const priceAge = 15 * 1000; // 15 seconds for more real-time updates
    
    const needsRefresh = mints.some(mint => {
      const price = tokenPrices[mint];
      return !price || (now - price.lastUpdated) > priceAge;
    });
    
    if (!needsRefresh) return;
    
    setIsLoadingPrices(true);
    try {
      console.log('🔄 Fetching fresh token prices from Jupiter for:', mints);
      const prices = await fetchTokenPrices(mints);
      console.log('✅ Received prices:', prices.length, 'tokens');
      
      const priceMap: { [mint: string]: TokenPrice } = {};
      prices.forEach(price => {
        priceMap[price.mint] = price;
      });
      
      setTokenPrices(prev => ({ ...prev, ...priceMap }));
      
      // If we have new prices and an amount, update the preview immediately
      if (swapAmount && parseFloat(swapAmount) > 0) {
        updateSwapPreview(parseFloat(swapAmount));
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch token prices:', error);
      // Don't clear existing prices on error, keep what we have
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Enhanced price fetching with retry logic
  const fetchPricesWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        await fetchPrices();
        return; // Success, exit
      } catch (error) {
        console.warn(`⚠️ Price fetch attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          console.error('❌ All price fetch attempts failed');
        } else {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
  };

  // Preload prices for common tokens using Jupiter
  const preloadCommonTokenPrices = async () => {
    if (network !== 'mainnet') return;
    
    try {
      console.log('🔄 Preloading common token prices from Jupiter...');
      const commonMints = [
        'So11111111111111111111111111111111111111112', // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // RAY
        'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'  // SRM
      ];
      
      const prices = await fetchTokenPrices(commonMints);
      const priceMap: { [mint: string]: TokenPrice } = {};
      const now = Date.now();
      
      prices.forEach(price => {
        priceMap[price.mint] = price;
      });
      
      setTokenPrices(prev => ({ ...prev, ...priceMap }));
      console.log('✅ Preloaded prices for', prices.length, 'common tokens from Jupiter');
    } catch (error) {
      console.warn('⚠️ Failed to preload common token prices from Jupiter:', error);
    }
  };

  // Calculate real-time conversion using Jupiter prices
  const calculateRealTimeConversion = (inputAmount: number, inputMint: string, outputMint: string): number => {
    if (!inputAmount || inputAmount <= 0) return 0;
    
    const inputPrice = tokenPrices[inputMint]?.price;
    const outputPrice = tokenPrices[outputMint]?.price;
    
    if (!inputPrice || !outputPrice) {
      console.log('⚠️ Missing Jupiter prices for conversion:', { inputMint, outputMint, inputPrice, outputPrice });
      return 0;
    }
    
    if (inputPrice <= 0 || outputPrice <= 0) {
      console.warn('⚠️ Invalid prices detected:', { inputPrice, outputPrice });
      return 0;
    }
    
    try {
      // Calculate conversion based on current market prices from Jupiter
      const inputValueUSD = inputAmount * inputPrice;
      const outputAmount = inputValueUSD / outputPrice;
      
      // Validate the result
      if (isNaN(outputAmount) || !isFinite(outputAmount) || outputAmount < 0) {
        console.warn('⚠️ Invalid conversion result:', outputAmount);
        return 0;
      }
      
      return outputAmount;
    } catch (error) {
      console.error('❌ Error calculating conversion:', error);
      return 0;
    }
  };

  // Update swap preview in real-time when amount changes
  const updateSwapPreview = (inputAmount: number) => {
    if (!inputAmount || inputAmount <= 0) {
      setSwapPreview(null);
      return;
    }
    
    const inputToken = findToken(swapInputMint);
    const outputToken = findToken(swapOutputMint);
    
    if (!inputToken || !outputToken) {
      setSwapPreview(null);
      return;
    }
    
    // Calculate real-time conversion using Jupiter prices
    const outputValue = calculateRealTimeConversion(inputAmount, swapInputMint, swapOutputMint);
    
    if (outputValue > 0) {
      const inputPrice = tokenPrices[swapInputMint]?.price || 0;
      const outputPrice = tokenPrices[swapOutputMint]?.price || 0;
      
      setSwapPreview({
        inputValue: inputAmount,
        outputValue,
        priceImpact: 0.1, // Default low price impact for real-time calculation
        fee: 0.000005, // Default network fee
        exchangeRate: outputPrice > 0 ? inputPrice / outputPrice : 0
      });
    } else {
      setSwapPreview(null);
    }
  };

  // Get swap quote from Jupiter when needed (for final swap execution)
  const getQuote = async () => {
    if (!swapAmount || !swapInputMint || !swapOutputMint || network !== 'mainnet') {
      setSwapQuote(null);
      return;
    }
    
    const amount = parseFloat(swapAmount);
    if (isNaN(amount) || amount <= 0) {
      setSwapQuote(null);
      return;
    }
    
    const inputToken = findToken(swapInputMint);
    if (!inputToken) return;
    
    const amountInAtomic = Math.round(amount * Math.pow(10, inputToken.decimals));
    
    setIsLoadingQuote(true);
    try {
      console.log('🔄 Getting Jupiter swap quote...');
      const quote = await getSwapQuote(swapInputMint, swapOutputMint, amountInAtomic, slippageBps);
      setSwapQuote(quote);
      
      // Update preview with actual Jupiter quote data if available
      if (quote) {
        const outputToken = findToken(swapOutputMint);
        if (outputToken) {
          const outputValue = quote.outputAmount / Math.pow(10, outputToken.decimals);
          const inputPrice = tokenPrices[swapInputMint]?.price || 0;
          const outputPrice = tokenPrices[swapOutputMint]?.price || 0;
          
          setSwapPreview({
            inputValue: amount,
            outputValue,
            priceImpact: quote.priceImpact,
            fee: quote.fee,
            exchangeRate: outputPrice > 0 ? inputPrice / outputPrice : 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to get Jupiter quote:', error);
      setSwapQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Update prices and quote when tokens change
  useEffect(() => {
    fetchPricesWithRetry();
  }, [swapInputMint, swapOutputMint, network]);

  // Real-time conversion when amount changes (no API calls)
  useEffect(() => {
    if (swapAmount && parseFloat(swapAmount) > 0) {
      updateSwapPreview(parseFloat(swapAmount));
    } else {
      setSwapPreview(null);
    }
  }, [swapAmount, swapInputMint, swapOutputMint, tokenPrices]);

  // Get quote only when needed (before swap execution)
  useEffect(() => {
    if (swapAmount && parseFloat(swapAmount) > 0 && swapInputMint && swapOutputMint && network === 'mainnet') {
      // Debounce quote fetching to avoid excessive API calls
      const timeoutId = setTimeout(() => {
        getQuote();
      }, 1000); // Wait 1 second after user stops typing
      
      return () => clearTimeout(timeoutId);
    }
  }, [swapAmount, slippageBps, swapInputMint, swapOutputMint]);

  // Refresh prices every 15 seconds for real-time data
  useEffect(() => {
    if (network === 'mainnet') {
      const interval = setInterval(() => {
        fetchPricesWithRetry();
      }, 15 * 1000); // 15 seconds for more frequent updates
      
      return () => clearInterval(interval);
    }
  }, [network, swapInputMint, swapOutputMint]);

  // Initial price fetch when component mounts
  useEffect(() => {
    if (network === 'mainnet') {
      preloadCommonTokenPrices();
    }
  }, [network]);

  // Preload prices when swap modal opens
  useEffect(() => {
    if (showSwap && network === 'mainnet') {
      preloadCommonTokenPrices();
    }
  }, [showSwap, network]);

  // Initialize with default tokens immediately
  useEffect(() => {
    const defaultTokens: KnownToken[] = [
      {
        symbol: 'SOL',
        name: 'Wrapped SOL',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
      }
    ];
    setAvailableTokens(defaultTokens);
    setFilteredTokens(defaultTokens);
  }, []);

  // Load all available tokens
  const loadTokens = async () => {
    try {
      setIsLoadingTokens(true);
      console.log('🔄 Starting token loading...');
      
      const tokens = await getAllTokens();
      console.log('✅ Loaded tokens:', tokens.length, 'tokens');
      console.log('📋 First few tokens:', tokens.slice(0, 5).map(t => ({ symbol: t.symbol, name: t.name, mint: t.mint })));
      
      if (tokens.length === 0) {
        console.error('❌ No tokens loaded!');
        setAvailableTokens([]);
        setFilteredTokens([]);
      } else {
        console.log('✅ Setting available tokens...');
        setAvailableTokens(tokens);
        setFilteredTokens(tokens);
        console.log('✅ Tokens set successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load tokens:', error);
      console.log('🔄 API failed, keeping default tokens');
      // Set empty arrays to avoid undefined issues
      setAvailableTokens([]);
      setFilteredTokens([]);
    } finally {
      setIsLoadingTokens(false);
      console.log('🏁 Token loading completed');
    }
  };

  // Load tokens when swap modal is opened
  useEffect(() => {
    if (showSwap && availableTokens.length === 0) {
      console.log('🔄 Swap modal opened, loading tokens...');
      loadTokens();
    }
  }, [showSwap, availableTokens.length]);

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
    
    // Refresh tokens every 2 minutes for real-time data
    const interval = setInterval(loadTokens, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Search tokens
  useEffect(() => {
    console.log('Search effect triggered with query:', searchQuery, 'availableTokens:', availableTokens.length);
    const search = async () => {
      if (!searchQuery.trim()) {
        console.log('🔍 Empty search query, showing all tokens');
        setFilteredTokens(availableTokens);
        return;
      }
      
      try {
        console.log('🔍 Searching for:', searchQuery);
        console.log('📊 Available tokens:', availableTokens.length);
        
        if (availableTokens.length === 0) {
          console.log('❌ No available tokens to search through');
          setFilteredTokens([]);
          return;
        }
        
        console.log('🔍 Calling searchTokens function...');
        const results = await searchTokens(searchQuery);
        console.log('✅ Search results:', results.length);
        console.log('📋 First few search results:', results.slice(0, 3).map(t => ({ symbol: t.symbol, name: t.name, mint: t.mint })));
        
        if (results.length === 0) {
          console.log('⚠️ No search results found');
          console.log('🔍 Available tokens for manual search:', availableTokens.slice(0, 5).map(t => ({ symbol: t.symbol, name: t.name, mint: t.mint })));
        }
        
        setFilteredTokens(results.slice(0, 50)); // Limit to 50 results for performance
      } catch (error) {
        console.error('❌ Search failed:', error);
        console.log('🔄 Falling back to local search...');
        
        // Fallback to local search
        const localResults = availableTokens.filter(token => 
          token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.mint.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        console.log('🔄 Local search results:', localResults.length);
        setFilteredTokens(localResults.slice(0, 50));
      }
    };
    
    // Remove debounce for real-time search
    search();
  }, [searchQuery, availableTokens]);

  useEffect(() => {
    const t = findToken(swapInputMint);
    if (t) setSwapDecimals(String(t.decimals));
  }, [swapInputMint]);

  const getInputTokenUiBalance = (): number => {
    const wsolMint = 'So11111111111111111111111111111111111111112';
    if (swapInputMint === wsolMint) {
      return balance; // use native SOL balance for wSOL input
    }
    const tb = tokenBalances.find(t => t.mint === swapInputMint);
    return tb ? tb.amount : 0;
  };

  const setPercent = (pct: number) => {
    if (pct <= 0) return setSwapAmount('');
    const amt = getInputTokenUiBalance() * pct;
    setSwapAmount(amt.toFixed(6));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;
  const formatBalance = (amount: number) => (!showBalance ? '****' : amount.toFixed(4));

  useEffect(() => {
    const estimate = async () => {
      if (!onEstimateFee || !toAddress) { setFeeEstimate(null); return; }
      try {
        const fee = await onEstimateFee(account.publicKey, toAddress);
        setFeeEstimate(fee);
      } catch {
        setFeeEstimate(null);
      }
    };
    estimate();
  }, [toAddress, onEstimateFee, account.publicKey]);

  const handleSend = async () => {
    setSendError(''); setSendSig('');
    const amt = parseFloat(amount);
    if (!toAddress || !amount || isNaN(amt) || amt <= 0) {
      setSendError('Enter a valid address and amount');
      return;
    }
    if (toAddress.length < 32) {
      setSendError('Recipient address looks invalid');
      return;
    }
    try {
      const sig = await onSendSOL(toAddress.trim(), amt);
      setSendSig(sig);
      setToAddress('');
      setAmount('');
      setFeeEstimate(null);
    } catch (e: any) {
      setSendError(e?.message || 'Failed to send');
    }
  };

  const explorerBase = network === 'mainnet'
    ? 'https://explorer.solana.com/tx/'
    : 'https://explorer.solana.com/tx/?cluster=devnet#';

  const handleAirdrop = async () => {
    if (!onAirdrop) return;
    try {
      await onAirdrop(1);
    } catch (e) {
      // ignore
    }
  };

  const handleExport = async () => {
    setExportError(''); setExportSk('');
    if (!onExportSecretKey) return;
    try {
      const res = await onExportSecretKey(passwordConfirm);
      setExportSk(res);
    } catch (e: any) {
      setExportError(e?.message || 'Failed to export');
    }
  };

  const handleImportPk = async () => {
    if (!onImportPrivateKey) return;
    try {
      await onImportPrivateKey(importPkValue.trim(), importPkPass, importPkName || 'Imported Account');
      setShowImportPk(false);
      setImportPkValue(''); setImportPkName('Imported Account'); setImportPkPass('');
    } catch (e) {
      // ignore; alert is handled upstream
    }
  };

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        setRpcMainnet(localStorage.getItem('prism_rpc_mainnet') || '');
        setRpcDevnet(localStorage.getItem('prism_rpc_devnet') || '');
      }
    } catch {}
  }, [showRpc]);

  const handleSaveRpc = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        if (rpcMainnet) localStorage.setItem('prism_rpc_mainnet', rpcMainnet); else localStorage.removeItem('prism_rpc_mainnet');
        if (rpcDevnet) localStorage.setItem('prism_rpc_devnet', rpcDevnet); else localStorage.removeItem('prism_rpc_devnet');
        window.location.reload();
      }
    } catch {}
  };

  // Switch input and output tokens
  const switchTokens = () => {
    setIsSwitchingTokens(true);
    
    const tempMint = swapInputMint;
    const tempAmount = swapAmount;
    
    setSwapInputMint(swapOutputMint);
    setSwapOutputMint(tempMint);
    setSwapAmount(tempAmount);
    
    // Clear quote and preview to force refresh
    setSwapQuote(null);
    setSwapPreview(null);
    
    // Show brief feedback
    const button = document.querySelector('[title="Switch tokens"]') as HTMLElement;
    if (button) {
      button.style.transform = 'rotate(180deg)';
      setTimeout(() => {
        button.style.transform = 'rotate(0deg)';
        setIsSwitchingTokens(false);
        
        // Show success message
        setShowSwitchSuccess(true);
        setTimeout(() => setShowSwitchSuccess(false), 2000);
      }, 300);
    } else {
      setIsSwitchingTokens(false);
      
      // Show success message
      setShowSwitchSuccess(true);
      setTimeout(() => setShowSwitchSuccess(false), 2000);
    }
  };

  const handleSwap = async () => {
    if (!onSwap) return;
    setSwapError(''); 
    setSwapSig('');
    
    // Validate inputs
    if (!swapInputMint || !swapOutputMint) {
      setSwapError('Please select input and output tokens');
      return;
    }
    
    const amt = parseFloat(swapAmount);
    if (isNaN(amt) || amt <= 0) {
      setSwapError('Please enter a valid amount');
      return;
    }
    
    const inputToken = findToken(swapInputMint);
    if (!inputToken) {
      setSwapError('Input token not found');
      return;
    }
    
    // Check balance
    const balance = getInputTokenUiBalance();
    if (amt > balance) {
      setSwapError(`Insufficient balance. You have ${balance.toFixed(6)} ${inputToken.symbol}`);
      return;
    }
    
    // Check if we have a quote
    if (!swapQuote) {
      setSwapError('Please wait for swap quote to load');
      return;
    }
    
    try {
      const sig = await onSwap(
        swapInputMint.trim(), 
        swapOutputMint.trim(), 
        amt, 
        inputToken.decimals, 
        slippageBps
      );
      setSwapSig(sig);
      
      // Reset form after successful swap
      setSwapAmount('');
      setSwapQuote(null);
      setSwapPreview(null);
      
    } catch (e: any) {
      console.error('Swap error:', e);
      setSwapError(e?.message || 'Swap failed. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 relative" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center cursor-pointer">
            <span className="text-white font-semibold text-sm">{account.name.charAt(0).toUpperCase()}</span>
          </div>
          {menuOpen && (
            <div className="absolute top-10 left-0 bg-white border rounded-lg shadow-lg w-56 z-10">
              <div className="py-1">
                {accounts.map(a => (
                  <button key={a.id} onClick={() => onSelectAccount && onSelectAccount(a.id)} className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between ${currentAccountId === a.id ? 'bg-gray-50' : ''}`}>
                    <span>{a.name}</span>
                    {currentAccountId === a.id && <span className="text-xs text-gray-400">Current</span>}
                  </button>
                ))}
              </div>
              <div className="border-t" />
              <button onClick={() => onStartCreateWallet && onStartCreateWallet()} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create wallet
              </button>
              <button onClick={() => setShowImportPk(true)} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Import private key
              </button>
              <button onClick={() => setShowExport(true)} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Export Secret Key
              </button>
              <button onClick={() => setShowRpc(true)} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">
                <Settings className="w-4 h-4" /> RPC Settings
              </button>
              <button onClick={() => setShowManageAccounts(true)} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Manage accounts
              </button>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-800">{account.name}</h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">{formatAddress(account.publicKey)}</span>
              <button onClick={() => copyToClipboard(account.publicKey)} className="text-gray-400 hover:text-gray-600">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${network === 'mainnet' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {network === 'mainnet' ? 'Mainnet' : 'Devnet'}
          </div>
          <button onClick={onLockWallet} className="text-gray-400 hover:text-gray-600">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <span className="text-purple-100">Total Balance</span>
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowBalance(!showBalance)} className="text-purple-100 hover:text-white">
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button onClick={onRefresh} disabled={loading} className="text-purple-100 hover:text-white disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex items-baseline space-x-2 mb-6">
          <span className="text-2xl font-bold">{formatBalance(balance)}</span>
          <span className="text-purple-100">SOL</span>
        </div>
        <div className="flex space-x-3">
          <button className="flex-1 bg-white/20 hover:bg-white/30 py-2 px-4 rounded-lg font-medium transition-colors" onClick={() => setShowSend(true)}>
            <Send className="w-4 h-4 inline mr-2" />
            Send
          </button>
          <button className="flex-1 bg-white/20 hover:bg-white/30 py-2 px-4 rounded-lg font-medium transition-colors" onClick={() => setShowReceive(true)}>
            Receive
          </button>
        </div>
        <div className="w-full flex justify-center mt-3">
          <button className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-white/30 hover:bg-white/40 text-white transition-colors" onClick={() => setShowSwap(true)}>
            <Shuffle className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Swap</span>
          </button>
        </div>
        {network === 'devnet' && onAirdrop && (
          <button onClick={handleAirdrop} className="mt-3 w-full bg-white/20 hover:bg-white/30 py-2 px-4 rounded-lg font-medium transition-colors">
            <Droplets className="w-4 h-4 inline mr-2" />
            Airdrop 1 SOL (Devnet)
          </button>
        )}
      </div>

      {/* Network Selector */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Network</span>
          </div>
          <div className="flex space-x-1">
            <button onClick={() => onSwitchNetwork('devnet')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${network === 'devnet' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
              Devnet
            </button>
            <button onClick={() => onSwitchNetwork('mainnet')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${network === 'mainnet' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
              Mainnet
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button onClick={() => setActiveTab('tokens')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'tokens' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
          Tokens
        </button>
        <button onClick={() => setActiveTab('activity')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'activity' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
          Activity
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === 'tokens' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
                <div>
                  <div className="font-medium text-gray-800">Solana</div>
                  <div className="text-sm text-gray-500">SOL</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-800">{showBalance ? balance.toFixed(4) : '****'}</div>
                <div className="text-sm text-gray-500">SOL</div>
              </div>
            </div>
            {tokenBalances.map((token, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-800">{token.name}</div>
                    <div className="text-sm text-gray-500">{token.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{showBalance ? token.amount.toFixed(4) : '****'}</div>
                  <div className="text-sm text-gray-500">{token.symbol}</div>
                </div>
              </div>
            ))}
            {tokenBalances.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No tokens found</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No recent transactions</p>
              </div>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.signature} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <div className="font-medium text-gray-800">{t.status === 'confirmed' ? 'Confirmed' : 'Pending'}</div>
                    <div className="text-xs text-gray-500">{new Date(t.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a href={`${explorerBase}${t.signature}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => copyToClipboard(t.signature)}>Copy Sig</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Send SOL</h3>
              <button onClick={() => { setShowSend(false); setSendError(''); setSendSig(''); }}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Address</label>
                <input value={toAddress} onChange={(e) => setToAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Enter Solana address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (SOL)</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="0.01" />
              </div>
              {feeEstimate != null && (
                <div className="text-xs text-gray-500">Estimated network fee: {feeEstimate.toFixed(6)} SOL</div>
              )}
              {sendError && <p className="text-sm text-red-500">{sendError}</p>}
              {sendSig && (
                <div className="text-xs text-green-600 break-all">
                  Sent! Signature: <a className="underline" href={`${explorerBase}${sendSig}`} target="_blank" rel="noreferrer">{sendSig}</a>
                </div>
              )}
            </div>
            <button onClick={handleSend} disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50">
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Receive SOL</h3>
              <button onClick={() => setShowReceive(false)}>✕</button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-xs break-all">{account.publicKey}</span>
                <button onClick={() => copyToClipboard(account.publicKey)} className="text-gray-600 hover:text-gray-800">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-center p-4">
                <QRCodeCanvas value={account.publicKey} size={128} includeMargin={true} />
              </div>
              <p className="text-xs text-gray-500 text-center">Scan or copy your address to receive SOL or tokens.</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Secret Key Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Export Secret Key</h3>
              <button onClick={() => { setShowExport(false); setPasswordConfirm(''); setExportError(''); setExportSk(''); }}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Enter your wallet password" />
              </div>
              {exportError && <p className="text-sm text-red-500">{exportError}</p>}
              {exportSk && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">{exportSk}</div>
                  <button onClick={() => copyToClipboard(exportSk)} className="w-full bg-gray-100 hover:bg-gray-200 py-2 px-4 rounded-lg text-sm">Copy</button>
                </div>
              )}
            </div>
            <button onClick={handleExport} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold">Reveal Secret Key</button>
          </div>
        </div>
      )}

      {/* Import Private Key Modal */}
      {showImportPk && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Import Private Key</h3>
              <button onClick={() => setShowImportPk(false)}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text.sm font-medium text-gray-700 mb-1">Secret Key</label>
                <textarea value={importPkValue} onChange={(e) => setImportPkValue(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Paste Base58, hex, or JSON array (64 numbers)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input value={importPkName} onChange={(e) => setImportPkName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={importPkPass} onChange={(e) => setImportPkPass(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Encrypt with a password" />
              </div>
            </div>
            <button onClick={handleImportPk} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold">Import</button>
          </div>
        </div>
      )}

      {/* RPC Settings Modal */}
      {showRpc && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">RPC Settings</h3>
              <button onClick={() => setShowRpc(false)}>✕</button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mainnet RPC URL</label>
                <input value={rpcMainnet} onChange={(e) => setRpcMainnet(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="https://api.mainnet-beta.solana.com" />
                <div className="text-xs text-gray-500 mt-1">
                  Default: https://api.mainnet-beta.solana.com
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devnet RPC URL</label>
                <input value={rpcDevnet} onChange={(e) => setRpcDevnet(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="https://api.devnet.solana.com" />
                <div className="text-xs text-gray-500 mt-1">
                  Default: https://api.devnet.solana.com
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-2">Recommended Public RPCs:</div>
                <div className="space-y-2 text-xs text-blue-700">
                  <div>
                    <strong>Mainnet:</strong>
                    <div className="ml-2 space-y-1">
                      <div>• https://api.mainnet-beta.solana.com (Official)</div>
                      <div>• https://solana-api.projectserum.com</div>
                      <div>• https://rpc.ankr.com/solana (Requires API key)</div>
                    </div>
                  </div>
                  <div>
                    <strong>Devnet:</strong>
                    <div className="ml-2">• https://api.devnet.solana.com (Official)</div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500">Changes will refresh the app. Use official endpoints for reliability.</p>
            </div>
            
            <div className="flex space-x-2">
              <button onClick={handleSaveRpc} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold">Save</button>
              <button onClick={() => {
                setRpcMainnet('https://api.mainnet-beta.solana.com');
                setRpcDevnet('https://api.devnet.solana.com');
              }} className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700">Reset to Defaults</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Accounts Modal */}
      {showManageAccounts && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Manage Accounts</h3>
              <button onClick={() => { setShowManageAccounts(false); setEditAccountId(null); setEditAccountName(''); }}>✕</button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accounts.length === 0 && (
                <div className="text-sm text-gray-500">No accounts</div>
              )}
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                  <div className="flex-1 mr-2">
                    {editAccountId === acc.id ? (
                      <input
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="font-medium text-gray-800 truncate">{acc.name}</div>
                    )}
                    <div className="text-xs text-gray-500 font-mono truncate">{acc.publicKey}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editAccountId === acc.id ? (
                      <>
                        <button
                          className="text-xs px-2 py-1 rounded bg-purple-500 text-white"
                          onClick={async () => {
                            if (onRenameAccount && editAccountName.trim()) {
                              await onRenameAccount(acc.id, editAccountName.trim());
                              setEditAccountId(null);
                              setEditAccountName('');
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="text-xs px-2 py-1 rounded bg-gray-200"
                          onClick={() => { setEditAccountId(null); setEditAccountName(''); }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="text-xs px-2 py-1 rounded bg-gray-200"
                          onClick={() => { setEditAccountId(acc.id); setEditAccountName(acc.name); }}
                        >
                          Rename
                        </button>
                        <button
                          className="text-xs px-2 py-1 rounded bg-red-500 text-white"
                          onClick={async () => {
                            if (onRemoveAccount) {
                              const ok = window.confirm('Remove this account from this device? You can re-import with recovery phrase or private key.');
                              if (ok) {
                                await onRemoveAccount(acc.id);
                              }
                            }
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500">
              Removing an account only deletes it from this device. Keep your recovery phrase safe to restore access.
            </div>
          </div>
        </div>
      )}

      {/* Swap Modal */}
      
      {showSwap && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Swap Tokens</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsLoadingTokens(true);
                    getAllTokens().then(tokens => {
                      setAvailableTokens(tokens);
                      setFilteredTokens(tokens);
                      setIsLoadingTokens(false);
                    }).catch(() => setIsLoadingTokens(false));
                  }}
                  disabled={isLoadingTokens}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                  title="Refresh tokens"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingTokens ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => { setShowSwap(false); setSwapSig(''); setSwapError(''); }}>✕</button>
              </div>
            </div>
            
            {/* Status Bar */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Tokens:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      availableTokens.length > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {availableTokens.length} available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Jupiter Prices:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      Object.keys(tokenPrices).length > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {Object.keys(tokenPrices).length} loaded
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {isLoadingPrices && <span className="flex items-center gap-1">🔄 <RefreshCw className="w-3 h-3 animate-spin" /></span>}
                  {network === 'mainnet' ? 'Mainnet' : 'Devnet'}
                </div>
              </div>
            </div>
            
            {/* Network Warning */}
            {network !== 'mainnet' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Info className="w-4 h-4" />
                  <span className="text-sm font-medium">Swap only available on Mainnet</span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">Please switch to Mainnet to use swap functionality.</p>
              </div>
            )}
            
            {/* Jupiter API Status Indicator */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-800">
                  <span className="text-sm font-medium">Jupiter API Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    availableTokens.length > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {availableTokens.length > 0 ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsLoadingPrices(true);
                      fetchPricesWithRetry();
                    }}
                    disabled={isLoadingPrices || network !== 'mainnet'}
                    className="p-1 rounded hover:bg-blue-100 disabled:opacity-50"
                    title="Refresh Jupiter prices"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingPrices ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={async () => {
                      console.log('🔍 Running Jupiter API diagnostic...');
                      try {
                        // Test token list
                        const tokenResponse = await new Promise((resolve) => {
                          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                            chrome.runtime.sendMessage({ type: 'GET_TOKENS' }, (response) => {
                              resolve(response || { ok: false, error: 'No response' });
                            });
                          } else {
                            resolve({ ok: false, error: 'Chrome extension API not available' });
                          }
                        });
                        
                        console.log('🔍 Token list response:', tokenResponse);
                        
                        // Test price fetch
                        const priceResponse = await new Promise((resolve) => {
                          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                            chrome.runtime.sendMessage({
                              type: 'GET_PRICE_FOR_MINTS',
                              payload: { mints: ['So11111111111111111111111111111111111111112'] }
                            }, (response) => {
                              resolve(response || { ok: false, error: 'No response' });
                            });
                          } else {
                            resolve({ ok: false, error: 'Chrome extension API not available' });
                          }
                        });
                        
                        console.log('🔍 Price fetch response:', priceResponse);
                        
                        // Show results in UI
                        const diagnosticInfo = `
Jupiter API Diagnostic Results:

Token List:
- Status: ${tokenResponse.ok ? '✅ OK' : '❌ Failed'}
- Response: ${JSON.stringify(tokenResponse, null, 2)}

Price Fetch:
- Status: ${priceResponse.ok ? '✅ OK' : '❌ Failed'}
- Response: ${JSON.stringify(priceResponse, null, 2)}

Check console for detailed logs.
                        `;
                        
                        alert(diagnosticInfo);
                        
                      } catch (error) {
                        console.error('🔍 Diagnostic failed:', error);
                        alert(`Diagnostic failed: ${error.message}`);
                      }
                    }}
                    className="p-1 rounded hover:bg-blue-100"
                    title="Run Jupiter API diagnostic"
                  >
                    🔍
                  </button>
                  <div className="text-xs text-blue-600">
                    {isLoadingPrices ? '🔄 Loading...' : '✅ Ready'}
                  </div>
                </div>
              </div>
              {availableTokens.length === 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  No tokens loaded. Click the refresh button above to load tokens from Jupiter.
                </p>
              )}
              {/* Jupiter Price Status */}
              {network === 'mainnet' && (
                <div className="mt-2 text-xs text-blue-600">
                  <div className="flex items-center gap-2">
                    <span>Real-time Prices:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      Object.keys(tokenPrices).length > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {Object.keys(tokenPrices).length > 0 ? `${Object.keys(tokenPrices).length} tokens priced` : 'No prices loaded'}
                    </span>
                    {Object.keys(tokenPrices).length > 0 && (
                      <span className="text-gray-500">
                        Last updated: {new Date(Math.max(...Object.values(tokenPrices).map(p => p.lastUpdated))).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Powered by Jupiter Aggregator API via Background Service Worker
                  </div>
                </div>
              )}
            </div>
            

            
            <div className="space-y-4">
              {/* You Pay */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">You Pay</div>
                  <div className="text-xs text-gray-500">
                    Balance: {formatBalance(getInputTokenUiBalance())} {findToken(swapInputMint)?.symbol}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    value={swapAmount} 
                    onChange={(e) => setSwapAmount(e.target.value)} 
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    placeholder="0" 
                  />
                  <div className="relative">
                    <button 
                      type="button" 
                      onClick={() => setShowInputTokenDropdown(!showInputTokenDropdown)} 
                      className="w-44 px-3 py-2 border rounded-lg flex items-center justify-between bg-white"
                    >
                      <div className="flex items-center gap-2">
                        {findToken(swapInputMint)?.logoURI ? (
                          <img src={findToken(swapInputMint)?.logoURI} alt={findToken(swapInputMint)?.symbol} className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                        )}
                        <span className="truncate">{findToken(swapInputMint)?.symbol || 'Token'}</span>
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showInputTokenDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        <div className="p-3 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search by name, symbol, or contract address..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-1 px-1">
                            💡 Search by token name, symbol, or paste a contract address
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {isLoadingTokens ? (
                            <div className="p-4 text-center text-gray-500">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                              <div className="text-xs">Fetching latest tokens...</div>
                            </div>
                          ) : filteredTokens.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No tokens found</div>
                          ) : (
                            filteredTokens.map((token) => (
                              <button
                                key={token.mint}
                                onClick={() => {
                                  setSwapInputMint(token.mint);
                                  setShowInputTokenDropdown(false);
                                  setSearchQuery('');
                                }}
                                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              >
                                {token.logoURI ? (
                                  <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                                )}
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{token.symbol}</div>
                                    {token.verified && (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">✓</span>
                                    )}
                                    {token.tags?.includes('memecoin') && (
                                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">🚀</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">{token.name}</div>
                                  <div className="text-xs text-gray-400 font-mono">
                                    {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                                  </div>
                                  {token.price && (
                                    <div className="text-xs text-green-600">${token.price.toFixed(6)}</div>
                                  )}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Token Price Info */}
                {tokenPrices[swapInputMint] && (
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Jupiter Price: ${tokenPrices[swapInputMint].price.toFixed(6)}</span>
                    <div className="flex items-center gap-1">
                      {tokenPrices[swapInputMint].priceChange24h > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      <span className={tokenPrices[swapInputMint].priceChange24h > 0 ? 'text-green-500' : 'text-red-500'}>
                        {Math.abs(tokenPrices[swapInputMint].priceChange24h).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Real-time Input Feedback */}
                {swapAmount && parseFloat(swapAmount) > 0 && (
                  <div className="mb-2 p-2 bg-white rounded-lg border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Input Value:</span>
                      <span className="font-medium text-gray-800">
                        {parseFloat(swapAmount).toFixed(6)} {findToken(swapInputMint)?.symbol}
                      </span>
                    </div>
                    {tokenPrices[swapInputMint]?.price && (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-600">USD Value:</span>
                        <span className="font-medium text-green-600">
                          ${(parseFloat(swapAmount) * tokenPrices[swapInputMint].price).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {swapPreview ? (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-600">Jupiter Conversion:</span>
                        <span className="text-green-600 font-medium">✓ Live</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-600">Status:</span>
                        <span className="text-yellow-600 font-medium">
                          {isLoadingPrices ? '🔄 Fetching Jupiter prices...' : '⏳ Waiting for Jupiter prices...'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Balance: {formatBalance(getInputTokenUiBalance())}</span>
                  <button onClick={() => setPercent(0.25)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">25%</button>
                  <button onClick={() => setPercent(0.5)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">50%</button>
                  <button onClick={() => setPercent(0.75)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">75%</button>
                  <button onClick={() => setPercent(1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">Max</button>
                </div>
              </div>
              
              {/* Center icon with switch button */}
              <div className="w-full flex justify-center flex-col items-center gap-2">
                {/* Token pair display */}
                <div className="text-xs text-gray-500 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <span className="font-medium">{findToken(swapInputMint)?.symbol || 'Token'}</span>
                    <span>→</span>
                    <span className="font-medium">{findToken(swapOutputMint)?.symbol || 'Token'}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-1 group">
                <button
                  onClick={switchTokens}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!isSwitchingTokens) switchTokens();
                    }
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    isSwitchingTokens 
                      ? 'bg-purple-300 text-purple-600 cursor-not-allowed' 
                      : 'bg-purple-200 text-purple-700 hover:bg-purple-300 hover:scale-110 active:scale-95'
                  }`}
                  title={swapPreview ? `Current rate: 1 ${findToken(swapInputMint)?.symbol} = ${swapPreview.exchangeRate.toFixed(6)} ${findToken(swapOutputMint)?.symbol}` : "Switch tokens"}
                  disabled={isSwitchingTokens}
                  aria-label="Switch input and output tokens"
                  aria-describedby="switch-tokens-description"
                >
                  {isSwitchingTokens ? (
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Shuffle className="w-4 h-4" />
                  )}
                </button>
                <span className={`text-xs font-medium ${isSwitchingTokens ? 'text-purple-500' : 'text-gray-500'}`}>
                  {isSwitchingTokens ? 'Switching...' : 'Switch'}
                </span>
                
                {/* Hidden description for screen readers */}
                <span id="switch-tokens-description" className="sr-only">
                  Click to swap the input and output tokens in this swap
                </span>
                
                {/* Success message */}
                {showSwitchSuccess && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-pulse">
                    Tokens switched!
                  </div>
                )}
                
                {/* Exchange rate tooltip */}
                {swapPreview && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-blue-600 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="text-center">
                      <div className="font-medium">Current Rate</div>
                      <div className="text-xs opacity-90">
                        1 {findToken(swapInputMint)?.symbol} = {swapPreview.exchangeRate.toFixed(6)} {findToken(swapOutputMint)?.symbol}
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"></div>
                  </div>
                )}
                </div>
              </div>
              
              {/* You Receive */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-2">You Receive</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-white border rounded-lg">
                    {swapAmount && parseFloat(swapAmount) > 0 ? (
                      swapPreview ? (
                        <div className="space-y-1">
                          <div className="text-lg font-medium text-green-600">
                            {swapPreview.outputValue.toFixed(6)}
                          </div>
                          {tokenPrices[swapInputMint]?.price && tokenPrices[swapOutputMint]?.price && (
                            <div className="text-xs text-gray-500">
                              ≈ ${(swapPreview.outputValue * tokenPrices[swapOutputMint].price).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm">
                          {isLoadingPrices ? 'Loading prices...' : 'Calculating...'}
                        </div>
                      )
                    ) : (
                      <div className="text-gray-400">0.00</div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <button 
                      type="button" 
                      onClick={() => setShowOutputTokenDropdown(!showOutputTokenDropdown)} 
                      className="w-full px-3 py-2 border rounded-lg flex items-center justify-between bg-white"
                    >
                      <div className="flex items-center gap-2">
                        {findToken(swapOutputMint)?.logoURI ? (
                          <img src={findToken(swapOutputMint)?.logoURI} alt={findToken(swapOutputMint)?.symbol} className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                        )}
                        <span className="truncate">{findToken(swapOutputMint)?.symbol || 'Token'}</span>
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showOutputTokenDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        <div className="p-3 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search by name, symbol, or contract address..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-1 px-1">
                            💡 Search by token name, symbol, or paste a contract address
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {isLoadingTokens ? (
                            <div className="p-4 text-center text-gray-500">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                              <div className="text-xs">Fetching latest tokens...</div>
                            </div>
                          ) : filteredTokens.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No tokens found</div>
                          ) : (
                            filteredTokens.map((token) => (
                              <button
                                key={token.mint}
                                onClick={() => {
                                  setSwapOutputMint(token.mint);
                                  setShowOutputTokenDropdown(false);
                                }}
                                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              >
                                {token.logoURI ? (
                                  <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                                )}
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{token.symbol}</div>
                                    {token.verified && (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">✓</span>
                                    )}
                                    {token.tags?.includes('memecoin') && (
                                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">🚀</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">{token.name}</div>
                                  <div className="text-xs text-gray-400 font-mono">
                                    {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                                  </div>
                                  {token.price && (
                                    <div className="text-xs text-green-600">${token.price.toFixed(6)}</div>
                                  )}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Real-time Conversion Status */}
                {swapAmount && parseFloat(swapAmount) > 0 && (
                  <div className="mt-3 p-2 bg-white rounded-lg border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Jupiter Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        swapPreview ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {swapPreview ? 'Live' : 'Calculating...'}
                      </span>
                    </div>
                    {swapPreview && (
                      <div className="mt-2 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Rate:</span>
                          <span className="font-medium">
                            1 {findToken(swapInputMint)?.symbol} = {swapPreview.exchangeRate.toFixed(6)} {findToken(swapOutputMint)?.symbol}
                          </span>
                        </div>
                        {tokenPrices[swapInputMint]?.price && tokenPrices[swapOutputMint]?.price && (
                          <div className="flex justify-between mt-1">
                            <span>Value:</span>
                            <span className="font-medium">
                              ${(parseFloat(swapAmount) * tokenPrices[swapInputMint].price).toFixed(2)} → ${(swapPreview.outputValue * tokenPrices[swapOutputMint].price).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Exchange Rate Display */}
              {swapPreview && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Jupiter Exchange Rate</div>
                    <div className="text-lg font-bold text-blue-800">
                      1 {findToken(swapInputMint)?.symbol} = {swapPreview.exchangeRate.toFixed(6)} {findToken(swapOutputMint)?.symbol}
                    </div>
                    {/* Real-time conversion amount */}
                    {swapAmount && parseFloat(swapAmount) > 0 && (
                      <div className="text-sm text-blue-600 mt-2">
                        {parseFloat(swapAmount).toFixed(6)} {findToken(swapInputMint)?.symbol} = {swapPreview.outputValue.toFixed(6)} {findToken(swapOutputMint)?.symbol}
                      </div>
                    )}
                    <div className="text-xs text-blue-500 mt-2">
                      Powered by Jupiter Aggregator - Real-time prices from all major DEXs
                    </div>
                  </div>
                </div>
              )}
              
              {/* Real-time Conversion Preview */}
              {swapAmount && parseFloat(swapAmount) > 0 && swapPreview && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800 mb-2">Jupiter Conversion Preview</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">You Pay:</span>
                      <span className="font-medium text-gray-800">
                        {parseFloat(swapAmount).toFixed(6)} {findToken(swapInputMint)?.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">You Receive:</span>
                      <span className="font-medium text-green-600">
                        {swapPreview.outputValue.toFixed(6)} {findToken(swapOutputMint)?.symbol}
                      </span>
                    </div>
                    {tokenPrices[swapInputMint]?.price && tokenPrices[swapOutputMint]?.price && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">USD Value:</span>
                        <span className="font-medium text-gray-800">
                          ${(parseFloat(swapAmount) * tokenPrices[swapInputMint].price).toFixed(2)} → ${(swapPreview.outputValue * tokenPrices[swapOutputMint].price).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Swap Preview */}
              {swapPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <div className="text-sm font-medium text-blue-800">Jupiter Swap Details</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price Impact:</span>
                      <span className={swapPreview.priceImpact > 2 ? 'text-red-600' : 'text-green-600'}>
                        {swapPreview.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network Fee:</span>
                      <span className="font-medium">~{swapPreview.fee.toFixed(6)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data Source:</span>
                      <span className="font-medium text-blue-600">Jupiter API</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Slippage Settings */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Slippage Tolerance</div>
                <div className="flex gap-2">
                  {[50, 100, 200, 500].map((bps) => (
                    <button
                      key={bps}
                      onClick={() => setSlippageBps(bps)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        slippageBps === bps
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {(bps / 100).toFixed(1)}%
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Higher slippage = higher success rate but worse prices
                </div>
              </div>
              
              {/* Error and Success Messages */}
              {swapError && <p className="text-sm text-red-500">{swapError}</p>}
              {swapSig && (
                <div className="text-xs text-green-600 break-all bg-green-50 p-2 rounded">
                  Swapped successfully! 
                  <a className="underline block mt-1" href={`${explorerBase}${swapSig}`} target="_blank" rel="noreferrer">
                    View on Explorer
                  </a>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleSwap} 
              disabled={loading || !onSwap || network !== 'mainnet' || !swapAmount || !swapPreview} 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Swapping...' : 'Swap'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};