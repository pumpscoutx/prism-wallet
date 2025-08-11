export interface KnownToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  volume24h?: number;
  marketCap?: number;
  coingeckoId?: string;
  tags?: string[];
  verified?: boolean;
}

export interface TokenPrice {
  mint: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: number;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  outputValue: number;
  priceImpact: number;
  fee: number;
  routes: Array<{
    name: string;
    outputAmount: number;
    priceImpact: number;
  }>;
}

// Enhanced token fetching with multiple sources including memecoins
export const fetchAllTokens = async (): Promise<KnownToken[]> => {
  try {
    console.log('Fetching comprehensive token list...');
    
    // Start with basic essential tokens
    const basicTokens: KnownToken[] = [
      {
        symbol: 'SOL',
        name: 'Solana',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        verified: true,
        tags: ['native', 'verified'],
        price: 100, // Default price
        volume24h: 1000000,
        marketCap: 10000000000
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        verified: true,
        tags: ['stablecoin', 'verified'],
        price: 1,
        volume24h: 500000,
        marketCap: 5000000000
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
        verified: true,
        tags: ['stablecoin', 'verified'],
        price: 1,
        volume24h: 300000,
        marketCap: 3000000000
      },
      {
        symbol: 'RAY',
        name: 'Raydium',
        mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
        verified: true,
        tags: ['defi', 'verified'],
        price: 2.5,
        volume24h: 200000,
        marketCap: 1000000000
      },
      {
        symbol: 'SRM',
        name: 'Serum',
        mint: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt/logo.png',
        verified: true,
        tags: ['defi', 'verified'],
        price: 0.5,
        volume24h: 150000,
        marketCap: 800000000
      },
      {
        symbol: 'MNGO',
        name: 'Mango',
        mint: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac/logo.png',
        verified: true,
        tags: ['defi', 'verified'],
        price: 0.02,
        volume24h: 100000,
        marketCap: 400000000
      },
      {
        symbol: 'BONK',
        name: 'Bonk',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        decimals: 5,
        logoURI: 'https://arweave.net/hQB3Ip5YBHh0Uq4XcNtT6oJiLBRgKqHwLz_4KqkQJqY',
        verified: false,
        tags: ['memecoin', 'trending'],
        price: 0.00001,
        volume24h: 500000,
        marketCap: 200000000
      },
      {
        symbol: 'SAMO',
        name: 'Samoyedcoin',
        mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU/logo.png',
        verified: true,
        tags: ['memecoin', 'verified'],
        price: 0.001,
        volume24h: 300000,
        marketCap: 150000000
      },
      {
        symbol: 'ORCA',
        name: 'Orca',
        mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png',
        verified: true,
        tags: ['defi', 'verified'],
        price: 3.5,
        volume24h: 250000,
        marketCap: 1200000000
      }
    ];
    
    const allTokens = new Map<string, KnownToken>();
    
    // Add basic tokens first
    basicTokens.forEach(token => {
      allTokens.set(token.mint.toLowerCase(), token);
    });
    
    console.log('Added basic tokens:', basicTokens.length);
    
    // Try to fetch from Jupiter API (includes verified and unverified tokens)
    try {
      console.log('Fetching from Jupiter API...');
      const jupiterResponse = await fetch('https://token.jup.ag/all', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (jupiterResponse.ok) {
        const jupiterData = await jupiterResponse.json();
        console.log('Jupiter API tokens:', jupiterData.tokens?.length || 0);
        
        jupiterData.tokens?.forEach((token: any) => {
          const mint = token.address.toLowerCase();
          if (!allTokens.has(mint)) {
            allTokens.set(mint, {
              symbol: token.symbol,
              name: token.name,
              mint: token.address,
              decimals: token.decimals,
              logoURI: token.logoURI,
              verified: false,
              tags: token.tags || [],
              price: undefined,
              volume24h: undefined,
              marketCap: undefined,
              coingeckoId: undefined
            });
          }
        });
      } else {
        console.log('Jupiter API failed with status:', jupiterResponse.status);
      }
    } catch (error) {
      console.log('Jupiter API failed with error:', error);
    }
    
    // Try to fetch from Solana token list (verified tokens)
    try {
      console.log('Fetching from Solana token list...');
      const solanaResponse = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (solanaResponse.ok) {
        const solanaData = await solanaResponse.json();
        console.log('Solana token list tokens:', solanaData.tokens?.length || 0);
        
        solanaData.tokens?.forEach((token: any) => {
          const mint = token.address.toLowerCase();
          if (!allTokens.has(mint)) {
            allTokens.set(mint, {
              symbol: token.symbol,
              name: token.name,
              mint: token.address,
              decimals: token.decimals,
              logoURI: token.logoURI,
              verified: true,
              tags: ['verified'],
              price: undefined,
              volume24h: undefined,
              marketCap: undefined,
              coingeckoId: undefined
            });
          } else {
            // Update existing token with verified status
            const existing = allTokens.get(mint);
            if (existing) {
              existing.verified = true;
              existing.tags = [...(existing.tags || []), 'verified'];
            }
          }
        });
      } else {
        console.log('Solana token list failed with status:', solanaResponse.status);
      }
    } catch (error) {
      console.log('Solana token list failed with error:', error);
    }
    
    // Try to fetch from Birdeye API for additional memecoins and trending tokens
    try {
      console.log('Fetching from Birdeye API...');
      const birdeyeResponse = await fetch('https://public-api.birdeye.so/public/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=500', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (birdeyeResponse.ok) {
        const birdeyeData = await birdeyeResponse.json();
        const birdeyeTokens = birdeyeData.data?.tokens || [];
        console.log('Birdeye API tokens:', birdeyeTokens.length);
        
        birdeyeTokens.forEach((token: any) => {
          const mint = token.address.toLowerCase();
          if (!allTokens.has(mint)) {
            allTokens.set(mint, {
              symbol: token.symbol || 'Unknown',
              name: token.name || 'Unknown Token',
              mint: token.address,
              decimals: token.decimals || 9,
              logoURI: token.logoURI,
              verified: false,
              tags: ['trending', 'memecoin'],
              price: token.price,
              volume24h: token.v24hUSD,
              marketCap: token.mc,
              coingeckoId: undefined
            });
          }
        });
      } else {
        console.log('Birdeye API failed with status:', birdeyeResponse.status);
      }
    } catch (error) {
      console.log('Birdeye API failed with error:', error);
    }
    
    const finalTokens = Array.from(allTokens.values());
    console.log('Total tokens loaded:', finalTokens.length);
    console.log('Sample tokens:', finalTokens.slice(0, 3).map(t => ({ symbol: t.symbol, name: t.name, mint: t.mint })));
    
    return finalTokens;
    
  } catch (error) {
    console.error('Failed to fetch comprehensive tokens:', error);
    
    // Return basic tokens as fallback
    return [
      {
        symbol: 'SOL',
        name: 'Solana',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        verified: true,
        tags: ['native', 'verified'],
        price: 100,
        volume24h: 1000000,
        marketCap: 10000000000
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        verified: true,
        tags: ['stablecoin', 'verified'],
        price: 1,
        volume24h: 500000,
        marketCap: 5000000000
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
        verified: true,
        tags: ['stablecoin', 'verified'],
        price: 1,
        volume24h: 300000,
        marketCap: 3000000000
      },
      {
        symbol: 'RAY',
        name: 'Raydium',
        mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
        verified: true,
        tags: ['defi', 'verified'],
        price: 2.5,
        volume24h: 200000,
        marketCap: 1000000000
      },
      {
        symbol: 'SRM',
        name: 'Serum',
        mint: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt/logo.png',
        verified: true,
        tags: ['defi', 'verified'],
        price: 0.5,
        volume24h: 150000,
        marketCap: 800000000
      },
      {
        symbol: 'MNGO',
        name: 'Mango',
        mint: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac/logo.png',
        verified: true,
        tags: ['defi', 'verified'],
        price: 0.02,
        volume24h: 100000,
        marketCap: 400000000
      },
      {
        symbol: 'BONK',
        name: 'Bonk',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        decimals: 5,
        logoURI: 'https://arweave.net/hQB3Ip5YBHh0Uq4XcNtT6oJiLBRgKqHwLz_4KqkQJqY',
        verified: false,
        tags: ['memecoin', 'trending'],
        price: 0.00001,
        volume24h: 500000,
        marketCap: 200000000
      },
      {
        symbol: 'SAMO',
        name: 'Samoyedcoin',
        mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU/logo.png',
        verified: true,
        tags: ['memecoin', 'verified'],
        price: 0.001,
        volume24h: 300000,
        marketCap: 150000000
      },
      {
        symbol: 'ORCA',
        name: 'Orca',
        mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png',
        verified: true,
        tags: ['defi', 'verified'],
        price: 3.5,
        volume24h: 250000,
        marketCap: 1200000000
      }
    ];
  }
};

// Enhanced CoinGecko data fetching
const fetchPopularTokenData = async (): Promise<Array<{
  symbol: string;
  name: string;
  price: number;
  volume24h: number;
  marketCap: number;
  coingeckoId: string;
}>> => {
  try {
    // Fetch top 250 tokens by market cap
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&locale=en'
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
      coingeckoId: coin.id
    }));
  } catch (error) {
    console.error('Failed to fetch CoinGecko data:', error);
    return [];
  }
};

// Enhanced real-time token prices with multiple sources
export const fetchTokenPrices = async (mints: string[]): Promise<TokenPrice[]> => {
  try {
    const prices: TokenPrice[] = [];
    
    // Use Jupiter price API for Solana tokens
    try {
      const jupiterResponse = await fetch('https://price.jup.ag/v4/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: mints })
      });
      
      if (jupiterResponse.ok) {
        const data = await jupiterResponse.json();
        Object.entries(data.data).forEach(([mint, priceData]: [string, any]) => {
          prices.push({
            mint,
            price: priceData.price,
            priceChange24h: priceData.priceChange24h || 0,
            volume24h: priceData.volume24h || 0,
            marketCap: priceData.marketCap || 0,
            lastUpdated: Date.now()
          });
        });
      }
    } catch (error) {
      console.log('Jupiter price API failed, trying alternatives');
    }
    
    // Use Birdeye API for additional price data
    try {
      const birdeyeResponse = await fetch(`https://public-api.birdeye.so/public/price?address=${mints.join(',')}`);
      if (birdeyeResponse.ok) {
        const data = await birdeyeResponse.json();
        data.data?.forEach((priceData: any) => {
          const existingPrice = prices.find(p => p.mint === priceData.address);
          if (!existingPrice) {
            prices.push({
              mint: priceData.address,
              price: priceData.value,
              priceChange24h: priceData.change24h || 0,
              volume24h: priceData.volume24h || 0,
              marketCap: priceData.marketCap || 0,
              lastUpdated: Date.now()
            });
          }
        });
      }
    } catch (error) {
      console.log('Birdeye price API failed');
    }
    
    return prices;
  } catch (error) {
    console.error('Failed to fetch token prices:', error);
    return [];
  }
};

// Enhanced swap quote with real-time conversion
export const getSwapQuote = async (
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 100
): Promise<SwapQuote | null> => {
  try {
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch quote');
    
    const data = await response.json();
    
    // Calculate output value in USD if possible
    let outputValue = data.outAmount;
    try {
      const prices = await fetchTokenPrices([outputMint]);
      if (prices.length > 0) {
        outputValue = (data.outAmount / Math.pow(10, data.outputDecimals || 9)) * prices[0].price;
      }
    } catch (error) {
      console.log('Could not calculate USD value for output token');
    }
    
    return {
      inputMint,
      outputMint,
      inputAmount: amount,
      outputAmount: data.outAmount,
      outputValue: outputValue,
      priceImpact: data.priceImpactPct || 0,
      fee: data.otherAmountThreshold || 0,
      routes: data.routes?.map((route: any) => ({
        name: route.marketInfos?.[0]?.label || 'Unknown',
        outputAmount: route.outAmount,
        priceImpact: route.priceImpactPct || 0
      })) || []
    };
  } catch (error) {
    console.error('Failed to get swap quote:', error);
    return null;
  }
};

// Enhanced token fetching with comprehensive sources
export const getAllTokens = async (): Promise<KnownToken[]> => {
  try {
    console.log('Fetching comprehensive tokens including memecoins...');
    return await fetchAllTokens();
  } catch (error) {
    console.error('Failed to fetch tokens:', error);
    // Fallback to basic tokens if API calls fail
    return [
      {
        symbol: 'SOL',
        name: 'Solana',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        verified: true,
        tags: ['native']
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        verified: true,
        tags: ['stablecoin']
      }
    ];
  }
};

// Enhanced search with multiple criteria including contract address
export const searchTokens = async (query: string): Promise<KnownToken[]> => {
  console.log('Enhanced search called with query:', query);
  
  try {
    const tokens = await getAllTokens();
    console.log('Got tokens for search:', tokens.length);
    
    if (!query.trim()) {
      // Return popular tokens when no query
      const popularTokens = tokens
        .filter(token => token.price && token.marketCap)
        .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
        .slice(0, 100);
      
      console.log('Returning popular tokens:', popularTokens.length);
      return popularTokens;
    }
    
    const lowerQuery = query.toLowerCase().trim();
    console.log('Searching for:', lowerQuery);
    
    // First, try exact matches
    const exactMatches = tokens.filter(token => 
      token.symbol.toLowerCase() === lowerQuery ||
      token.name.toLowerCase() === lowerQuery ||
      token.mint.toLowerCase() === lowerQuery
    );
    
    if (exactMatches.length > 0) {
      console.log('Found exact matches:', exactMatches.length);
      return exactMatches;
    }
    
    // Then, try partial matches
    const partialMatches = tokens.filter(token => {
      // Search by symbol (partial)
      const symbolMatch = token.symbol.toLowerCase().includes(lowerQuery);
      
      // Search by name (partial)
      const nameMatch = token.name.toLowerCase().includes(lowerQuery);
      
      // Search by contract address (partial)
      const mintMatch = token.mint.toLowerCase().includes(lowerQuery);
      
      // Search by tags
      const tagMatch = token.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      
      return symbolMatch || nameMatch || mintMatch || tagMatch;
    });
    
    console.log('Found partial matches:', partialMatches.length);
    
    // Enhanced sorting by relevance
    partialMatches.sort((a, b) => {
      // Exact symbol matches first
      const aSymbolStartsWith = a.symbol.toLowerCase().startsWith(lowerQuery);
      const bSymbolStartsWith = b.symbol.toLowerCase().startsWith(lowerQuery);
      if (aSymbolStartsWith && !bSymbolStartsWith) return -1;
      if (!aSymbolStartsWith && bSymbolStartsWith) return 1;
      
      // Then by verification status
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      
      // Then by market cap
      return (b.marketCap || 0) - (a.marketCap || 0);
    });
    
    console.log('Search results:', partialMatches.length, 'tokens');
    return partialMatches.slice(0, 200); // Limit results for performance
    
  } catch (error) {
    console.error('Search failed, returning basic tokens:', error);
    
    // Fallback to basic token search
    const basicTokens = [
      { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112' },
      { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      { symbol: 'USDT', name: 'Tether USD', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
      { symbol: 'RAY', name: 'Raydium', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
      { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' }
    ];
    
    const lowerQuery = query.toLowerCase().trim();
    return basicTokens.filter(token => 
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery) ||
      token.mint.toLowerCase().includes(lowerQuery)
    );
  }
};

// Enhanced token lookup by mint address
export const getTokenByMint = async (mint: string): Promise<KnownToken | null> => {
  try {
    const tokens = await getAllTokens();
    const token = tokens.find(token => token.mint.toLowerCase() === mint.toLowerCase());
    
    if (!token) {
      // Try to fetch individual token data from Birdeye
      try {
        const response = await fetch(`https://public-api.birdeye.so/public/token?address=${mint}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            return {
              symbol: data.data.symbol || 'Unknown',
              name: data.data.name || 'Unknown Token',
              mint: mint,
              decimals: data.data.decimals || 9,
              logoURI: data.data.logoURI,
              verified: false,
              tags: ['discovered'],
              price: data.data.price,
              volume24h: data.data.v24hUSD,
              marketCap: data.data.mc
            };
          }
        }
      } catch (error) {
        console.log('Could not fetch individual token data');
      }
    }
    
    return token || null;
  } catch (error) {
    console.error('Error getting token by mint:', error);
    return null;
  }
};

// Get popular and trending tokens
export const getPopularTokens = async (): Promise<KnownToken[]> => {
  const tokens = await getAllTokens();
  return tokens
    .filter(token => token.price && token.marketCap)
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .slice(0, 50);
};

// Get trending memecoins
export const getTrendingMemecoins = async (): Promise<KnownToken[]> => {
  const tokens = await getAllTokens();
  return tokens
    .filter(token => token.tags?.includes('memecoin') || token.tags?.includes('trending'))
    .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
    .slice(0, 20);
}; 