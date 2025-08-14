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

// Jupiter API endpoints
const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/all';
const JUPITER_PRICE_URL = 'https://price.jup.ag/v4/price';
const JUPITER_QUOTE_URL = 'https://quote-api.jup.ag/v6/quote';

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
    console.log('🔄 Fetching token list from Jupiter...');
    const response = await fetch(JUPITER_TOKEN_LIST_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
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

    console.log(`✅ Fetched ${validTokens.length} tokens from Jupiter`);
    
    // Update cache
    tokenListCache = validTokens;
    lastTokenFetch = now;
    
    return validTokens;
  } catch (error) {
    console.error('❌ Failed to fetch tokens from Jupiter:', error);
    
    // Return cached tokens if available, even if expired
    if (tokenListCache.length > 0) {
      console.log('🔄 Returning cached tokens due to fetch error');
      return tokenListCache;
    }
    
    // Fallback to default tokens
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

export const fetchTokenPrices = async (mints: string[]): Promise<TokenPrice[]> => {
  if (mints.length === 0) return [];
  
  const now = Date.now();
  const priceAge = 15 * 1000; // 15 seconds for prices
  
  // Check cache first
  const cachedPrices: TokenPrice[] = [];
  const uncachedMints: string[] = [];
  
  mints.forEach(mint => {
    const cached = priceCache[mint];
    if (cached && (now - cached.lastUpdated) < priceAge) {
      cachedPrices.push(cached);
    } else {
      uncachedMints.push(mint);
    }
  });
  
  // If all prices are cached and fresh, return them
  if (uncachedMints.length === 0) {
    return cachedPrices;
  }
  
  try {
    console.log(`🔄 Fetching prices for ${uncachedMints.length} tokens from Jupiter...`);
    
    const response = await fetch(`${JUPITER_PRICE_URL}?ids=${uncachedMints.join(',')}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const newPrices: TokenPrice[] = [];
    
    uncachedMints.forEach(mint => {
      const priceData = data.data[mint];
      if (priceData) {
        const price: TokenPrice = {
          mint,
          price: priceData.price || 0,
          priceChange24h: priceData.priceChange24h || 0,
          lastUpdated: now
        };
        
        newPrices.push(price);
        priceCache[mint] = price; // Update cache
      }
    });
    
    console.log(`✅ Fetched ${newPrices.length} new prices from Jupiter`);
    
    // Return both cached and new prices
    return [...cachedPrices, ...newPrices];
    
  } catch (error) {
    console.error('❌ Failed to fetch prices from Jupiter:', error);
    
    // Return cached prices if available, even if expired
    if (cachedPrices.length > 0) {
      console.log('🔄 Returning cached prices due to fetch error');
      return cachedPrices;
    }
    
    return [];
  }
};

export const getSwapQuote = async (
  inputMint: string,
  outputMint: string,
  amountIn: number,
  slippageBps: number = 100
): Promise<SwapQuote | null> => {
  try {
    console.log(`🔄 Getting swap quote for ${amountIn} of ${inputMint} to ${outputMint}`);
    
    const response = await fetch(
      `${JUPITER_QUOTE_URL}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountIn}&slippageBps=${slippageBps}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
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
    
    console.log(`✅ Got quote: ${quote.outputAmount} output with ${quote.priceImpact}% price impact`);
    
    return quote;
    
  } catch (error) {
    console.error('❌ Failed to get swap quote:', error);
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
    await fetchTokenPrices(commonMints);
  } catch (error) {
    console.warn('⚠️ Failed to preload common token prices:', error);
  }
}; 