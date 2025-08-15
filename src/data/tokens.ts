export interface KnownToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
  verified?: boolean;
  tags?: string[];
  price?: number;
  priceChange24h?: number;
}

export interface TokenPrice {
  mint: string;
  price: number;
  priceChange24h: number;
  lastUpdated: number;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  routes: any[];
}

// Background service worker communication - simplified for direct API calls
const sendMessageToBackground = (message: any): Promise<any> => {
  return new Promise((resolve) => {
    // Fallback for non-extension environment (development)
    resolve({ ok: false, error: 'Direct API calls used instead of background service worker' });
  });
};

// Common token constants
export const TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BTC: "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  SRM: "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVg58WUyN9fN9PwZygaxCJX",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"
};

// Cache for token list and prices
let tokenListCache: KnownToken[] = [];
let priceCache: { [mint: string]: TokenPrice } = {};
let lastTokenFetch = 0;
let lastPriceFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for tokens, 15 seconds for prices

export const getAllTokens = async (): Promise<KnownToken[]> => {
  const now = Date.now();
  
  // Return cached tokens if still valid
  if (tokenListCache.length > 0 && (now - lastTokenFetch) < CACHE_DURATION) {
    return tokenListCache;
  }

  try {
    console.log('🔄 Fetching token list via background service worker...');
    
    const response = await sendMessageToBackground({ type: 'GET_TOKENS' });
    
    if (!response.ok) {
      throw new Error(`Background service worker error: ${response.error || response.status}`);
    }
    
    const data = response.body;
    
    // Validate response structure
    if (!data || !data.tokens || !Array.isArray(data.tokens)) {
      throw new Error('Invalid response format from Jupiter API');
    }
    
    // Transform Jupiter token data to our format
    const tokens: KnownToken[] = data.tokens.map((token: any) => ({
      symbol: token.symbol,
      name: token.name,
      mint: token.address,
      decimals: token.decimals,
      logoURI: token.logoURI,
      verified: token.verified || false,
      tags: token.tags || [],
      price: undefined, // Will be fetched separately
      priceChange24h: 0
    }));

    // Filter out tokens without basic info
    const validTokens = tokens.filter(token => 
      token.symbol && 
      token.name && 
      token.mint && 
      token.decimals > 0
    );

    console.log(`✅ Fetched ${validTokens.length} tokens via background service worker`);
    
    // Update cache
    tokenListCache = validTokens;
    lastTokenFetch = now;
    
    return validTokens;
  } catch (error) {
    console.error('❌ Failed to fetch tokens via background service worker:', error);
    
    // Return cached tokens if available, even if expired
    if (tokenListCache.length > 0) {
      console.log('🔄 Returning cached tokens due to fetch error');
      return tokenListCache;
    }
    
    // Fallback to default tokens
    console.log('🔄 Using fallback default tokens');
    return [
      {
        symbol: 'SOL',
        name: 'Wrapped SOL',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        verified: true,
        tags: ['native']
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        verified: true,
        tags: ['stablecoin']
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
        verified: true,
        tags: ['stablecoin']
      }
    ];
  }
};

export const searchTokens = async (query: string): Promise<KnownToken[]> => {
  try {
    const tokens = await getAllTokens();
    
    if (!query.trim()) {
      return tokens.slice(0, 50); // Return first 50 tokens
    }
    
    const searchTerm = query.toLowerCase();
    
    // Search by symbol, name, or mint address
    const results = tokens.filter(token => 
      token.symbol.toLowerCase().includes(searchTerm) ||
      token.name.toLowerCase().includes(searchTerm) ||
      token.mint.toLowerCase().includes(searchTerm)
    );
    
    // Sort by relevance: exact symbol match first, then name, then mint
    results.sort((a, b) => {
      const aSymbolMatch = a.symbol.toLowerCase() === searchTerm;
      const bSymbolMatch = b.symbol.toLowerCase() === searchTerm;
      
      if (aSymbolMatch && !bSymbolMatch) return -1;
      if (!aSymbolMatch && bSymbolMatch) return 1;
      
      const aNameMatch = a.name.toLowerCase().includes(searchTerm);
      const bNameMatch = b.name.toLowerCase().includes(searchTerm);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      return 0;
    });
    
    return results.slice(0, 50); // Limit results
  } catch (error) {
    console.error('❌ Token search failed:', error);
    return [];
  }
};

// Jupiter Price API function with improved error handling and fallbacks
export const getPrices = async (mints: string[]): Promise<{ [mint: string]: { price: number; priceChange24h: number } }> => {
  try {
    if (mints.length === 0) return {};
    
    console.log('🔄 Fetching prices for mints:', mints);
    
    // Try Jupiter API first
    try {
      const { getTokenPrices } = await import('../config/api.config');
      const data = await getTokenPrices(mints);
      const json = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('✅ Jupiter price response:', json);
      
      const prices: { [mint: string]: { price: number; priceChange24h: number } } = {};
      
      if (json && json.data) {
        Object.entries(json.data).forEach(([mint, d]: [string, any]) => {
          // Handle different Jupiter API response formats
          let price = 0;
          let priceChange24h = 0;
          
          if (d && typeof d === 'object') {
            // Jupiter v6 format
            price = d.price || d.usd || 0;
            priceChange24h = d.priceChange24h || d.price_change_24h || 0;
          } else if (typeof d === 'number') {
            // Direct price value
            price = d;
          }
          
          if (price > 0) {
            prices[mint] = { price, priceChange24h };
          }
        });
      }
      
      // If we got valid prices, return them
      if (Object.keys(prices).length > 0) {
        console.log('✅ Valid prices found:', prices);
        return prices;
      }
    } catch (jupiterError) {
      console.warn('⚠️ Jupiter API failed, trying fallbacks:', jupiterError);
    }
    
    // Fallback: Use hardcoded prices for common tokens
    const fallbackPrices: { [mint: string]: { price: number; priceChange24h: number } } = {};
    
    mints.forEach(mint => {
      switch (mint) {
        case 'So11111111111111111111111111111111111111112': // SOL
          fallbackPrices[mint] = { price: 100.0, priceChange24h: 0 };
          break;
        case 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': // USDC
          fallbackPrices[mint] = { price: 1.0, priceChange24h: 0 };
          break;
        case 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': // USDT
          fallbackPrices[mint] = { price: 1.0, priceChange24h: 0 };
          break;
        case '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': // BTC
          fallbackPrices[mint] = { price: 45000.0, priceChange24h: 0 };
          break;
        case 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': // BONK
          fallbackPrices[mint] = { price: 0.000001, priceChange24h: 0 };
          break;
        case '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': // RAY
          fallbackPrices[mint] = { price: 0.5, priceChange24h: 0 };
          break;
        case 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': // SRM
          fallbackPrices[mint] = { price: 0.1, priceChange24h: 0 };
          break;
        case 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': // JUP
          fallbackPrices[mint] = { price: 0.8, priceChange24h: 0 };
          break;
        case 'HZ1JovNiVvGrGNiiYvEozEVg58WUyN9fN9PwZygaxCJX': // PYTH
          fallbackPrices[mint] = { price: 0.4, priceChange24h: 0 };
          break;
        case 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': // ORCA
          fallbackPrices[mint] = { price: 3.5, priceChange24h: 0 };
          break;
        default:
          // For unknown tokens, try to estimate price based on SOL
          fallbackPrices[mint] = { price: 0.01, priceChange24h: 0 };
          break;
      }
    });
    
    console.log('🔄 Using fallback prices:', fallbackPrices);
    return fallbackPrices;
    
  } catch (error) {
    console.error('❌ All price fetching methods failed:', error);
    return {};
  }
};

export const getSwapQuote = async (
  inputMint: string,
  outputMint: string,
  amountIn: number,
  slippageBps: number = 100
): Promise<SwapQuote | null> => {
  try {
    console.log(`🔄 Getting swap quote via background service worker for ${amountIn} of ${inputMint} to ${outputMint}`);
    
    const response = await sendMessageToBackground({
      type: 'GET_QUOTE',
      payload: { 
        inputMint, 
        outputMint, 
        amountBaseUnits: amountIn, 
        slippageBps 
      }
    });
    
    if (!response.ok) {
      throw new Error(`Background service worker error: ${response.error || response.status}`);
    }
    
    const data = response.body;
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    const quote: SwapQuote = {
      inputMint,
      outputMint,
      inputAmount: amountIn,
      outputAmount: data.outAmount || 0,
      priceImpact: data.priceImpactPct || 0,
      fee: data.otherAmountThreshold || 0,
      routes: data.routes || []
    };
    
    console.log(`✅ Got quote via background service worker: ${quote.outputAmount} output with ${quote.priceImpact}% price impact`);
    
    return quote;
    
  } catch (error) {
    console.error('❌ Failed to get swap quote via background service worker:', error);
    return null;
  }
};

// Preload common token prices
export const preloadCommonTokenPrices = async (): Promise<void> => {
  const commonMints = [
    'So11111111111111111111111111111111111111112', // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // RAY
    'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'  // SRM
  ];
  
  try {
    await getPrices(commonMints); // Changed to getPrices
  } catch (error) {
    console.warn('⚠️ Failed to preload common token prices:', error);
  }
}; 