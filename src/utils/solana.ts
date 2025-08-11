import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, Keypair, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenBalance } from '../types/wallet';

export class SolanaUtils {
  private static connections: { [key: string]: Connection } = {};

  static getConnection(network: 'mainnet' | 'devnet'): Connection {
    if (!this.connections[network]) {
      const defaultUrls = {
        mainnet: 'https://rpc.ankr.com/solana',
        devnet: 'https://api.devnet.solana.com'
      } as const;
      let rpcUrl: string = defaultUrls[network];
      try {
        const override = typeof localStorage !== 'undefined' ? localStorage.getItem(`prism_rpc_${network}`) : null;
        if (override && /^https?:\/\//.test(override)) {
          rpcUrl = override;
        }
      } catch {}
      this.connections[network] = new Connection(rpcUrl, 'confirmed');
    }
    return this.connections[network];
  }

  static resetConnections(): void {
    this.connections = {};
  }

  static async getBalance(publicKey: string, network: 'mainnet' | 'devnet'): Promise<number> {
    try {
      const connection = this.getConnection(network);
      const pubKey = new PublicKey(publicKey);
      const balance = await connection.getBalance(pubKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  static async getTokenBalances(publicKey: string, network: 'mainnet' | 'devnet'): Promise<TokenBalance[]> {
    try {
      const connection = this.getConnection(network);
      const pubKey = new PublicKey(publicKey);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const balances: TokenBalance[] = [];
      
      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed;
        const info = accountData.info;
        
        if (info.tokenAmount.uiAmount > 0) {
          balances.push({
            mint: info.mint,
            symbol: 'Unknown',
            name: 'Unknown Token',
            amount: info.tokenAmount.uiAmount,
            decimals: info.tokenAmount.decimals,
          });
        }
      }

      return balances;
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return [];
    }
  }

  static async sendTransaction(
    fromKeypair: Keypair,
    toPublicKey: string,
    amount: number,
    network: 'mainnet' | 'devnet'
  ): Promise<string> {
    const connection = this.getConnection(network);
    const toPubKey = new PublicKey(toPublicKey);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubKey,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
    return signature;
  }

  static async getRecentTransactions(publicKey: string, network: 'mainnet' | 'devnet', limit = 10) {
    try {
      const connection = this.getConnection(network);
      const pubKey = new PublicKey(publicKey);
      const signatures = await connection.getSignaturesForAddress(pubKey, { limit });
      
      const transactions = [] as Array<{ signature: string; timestamp: number; status: string }>;
      for (const sig of signatures) {
        const tx = await connection.getParsedTransaction(sig.signature);
        if (tx) {
          transactions.push({
            signature: sig.signature,
            timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
            status: sig.confirmationStatus === 'finalized' ? 'confirmed' : 'pending',
          });
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  static async estimateTransferFee(from: string, to: string, network: 'mainnet' | 'devnet'): Promise<number> {
    try {
      const connection = this.getConnection(network);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(from),
          toPubkey: new PublicKey(to),
          lamports: 1,
        })
      );
      const { value: fee } = await connection.getFeeForMessage(tx.compileMessage());
      if (fee != null) return fee / LAMPORTS_PER_SOL;
    } catch (e) {
      console.warn('Fee estimation fallback:', e);
    }
    return 5000 / LAMPORTS_PER_SOL;
  }

  static async requestAirdrop(publicKey: string, amountSol: number): Promise<string> {
    const connection = this.getConnection('devnet');
    const pubKey = new PublicKey(publicKey);
    const sig = await connection.requestAirdrop(pubKey, Math.round(amountSol * LAMPORTS_PER_SOL));
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
    return sig;
  }

  static async swapViaJupiter(
    userKeypair: Keypair,
    inputMint: string,
    outputMint: string,
    amountInAtomic: number,
    slippageBps: number,
    network: 'mainnet' | 'devnet'
  ): Promise<string> {
    try {
      // For devnet, we'll use a mock swap or throw an error
      if (network !== 'mainnet') {
        throw new Error('Swap currently supported on Mainnet only. Please switch to Mainnet to use swap functionality.');
      }
      
      const connection = this.getConnection(network);
      const baseUrl = 'https://quote-api.jup.ag/v6';

      // 1) Get quote with better error handling
      const quoteUrl = `${baseUrl}/quote?inputMint=${encodeURIComponent(inputMint)}&outputMint=${encodeURIComponent(outputMint)}&amount=${amountInAtomic}&slippageBps=${slippageBps}`;
      console.log('Fetching quote from:', quoteUrl);
      
      const quoteRes = await fetch(quoteUrl);
      if (!quoteRes.ok) {
        const errorText = await quoteRes.text();
        console.error('Quote API error:', quoteRes.status, errorText);
        throw new Error(`Failed to fetch quote: ${quoteRes.status} - ${errorText}`);
      }
      
      const quote = await quoteRes.json();
      console.log('Quote received:', quote);

      // 2) Get swap transaction with enhanced options
      const swapRes = await fetch(`${baseUrl}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: userKeypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          useSharedAccounts: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 0,
          // Add additional swap options for better execution
          asLegacyTransaction: false,
          useTokenLedger: true
        })
      });
      
      if (!swapRes.ok) {
        const errorText = await swapRes.text();
        console.error('Swap API error:', swapRes.status, errorText);
        throw new Error(`Failed to build swap transaction: ${swapRes.status} - ${errorText}`);
      }
      
      const { swapTransaction } = await swapRes.json();
      console.log('Swap transaction built successfully');

      // 3) Deserialize and sign transaction
      const txBuffer = Buffer.from(swapTransaction, 'base64');
      const vtx = VersionedTransaction.deserialize(txBuffer);
      vtx.sign([userKeypair]);

      // 4) Send transaction with better retry logic
      console.log('Sending swap transaction...');
      const sig = await connection.sendRawTransaction(vtx.serialize(), { 
        skipPreflight: false, 
        maxRetries: 3,
        preflightCommitment: 'confirmed'
      });
      
      console.log('Swap transaction sent:', sig);
      
      // 5) Wait for confirmation with timeout
      const latest = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Swap transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log('Swap transaction confirmed successfully');
      return sig;
      
    } catch (error) {
      console.error('Swap execution failed:', error);
      
      // Provide more user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient balance for swap. Please check your token balance and try again.');
        } else if (error.message.includes('slippage')) {
          throw new Error('Swap failed due to high slippage. Try reducing the swap amount or increasing slippage tolerance.');
        } else if (error.message.includes('quote')) {
          throw new Error('Unable to get swap quote. The token pair may not be supported or liquidity may be insufficient.');
        } else if (error.message.includes('transaction')) {
          throw new Error('Swap transaction failed. Please try again or check your network connection.');
        }
      }
      
      throw new Error(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}