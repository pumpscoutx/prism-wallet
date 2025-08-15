# Prism Wallet

A Solana browser wallet extension with Jupiter token swaps.

## Features



## Technical Implementation

The wallet uses Jupiter API for token swaps and price data.

### Common Token Constants
```javascript
const TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
};
```

## Browser Extension Setup

### Manifest Permissions
The extension includes necessary permissions for Jupiter API:
```json
{
  "host_permissions": [
    "https://*.solana.com/*",
    "https://*.quicknode.pro/*",
    "https://quote-api.jup.ag/*",
    "https://token.jup.ag/*",
    "https://price.jup.ag/*"
  ]
}
```

### Background Service Worker
- Handles Jupiter API requests to avoid CORS issues
- Manages token list and price fetching
- Provides quote and swap transaction building

## Usage

1. **Install Extension**: Load the extension in Chrome/Edge
2. **Create/Import Wallet**: Set up your Solana wallet
3. **Switch to Mainnet**: Ensure you're on mainnet for swap functionality
4. **Open Swap Modal**: Click the swap button in the dashboard
5. **Select Tokens**: Choose tokens to swap using the dropdown selectors
6. **Enter Amount**: Input the amount you want to swap
7. **View Exchange Rate**: See the current exchange rate from Jupiter
8. **Set Slippage**: Choose your slippage tolerance
9. **Execute Swap**: Click swap to execute the transaction

## Architecture

### Components
- **WalletDashboard**: Main dashboard with swap functionality
- **Background Service Worker**: Handles API requests and CORS

### Data Flow
1. User opens swap modal
2. Jupiter API fetches prices and quotes
3. Exchange rate calculated and displayed
4. User confirms swap with slippage settings
5. Jupiter Quote API generates swap transaction
6. Solana RPC executes transaction

## Development

### Prerequisites
- Node.js 16+
- Chrome/Edge browser for extension development

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Load Extension
1. Build the project
2. Open Chrome Extensions (chrome://extensions/)
3. Enable Developer Mode
4. Load unpacked extension from `dist` folder

## Security Features

- **Encrypted Storage**: Private keys encrypted with user password
- **Secure RPC**: QuickNode provides enterprise-grade security
- **API Validation**: All Jupiter API responses validated
- **Transaction Signing**: Local transaction signing for security

## Performance Optimizations

- **Price Caching**: Standard caching for price data
- **Token List Caching**: 5-minute cache for token metadata
- **Background Processing**: API requests handled in background worker
- **Lazy Loading**: Components load only when needed

## Troubleshooting

### Common Issues
1. **Prices not loading**: Check network connection and Jupiter API status
2. **Swap failing**: Ensure sufficient balance and correct slippage settings
3. **RPC errors**: Verify QuickNode endpoint is accessible
4. **CORS issues**: Ensure background service worker is running

### Debug Mode
Enable console logging for detailed debugging:
```javascript
localStorage.setItem('debug', 'true');
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review console logs for error details
- Ensure you're on mainnet for swap functionality 