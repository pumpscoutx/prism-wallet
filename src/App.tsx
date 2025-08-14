import React, { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { CreateWallet } from './components/CreateWallet';
import { ImportWallet } from './components/ImportWallet';
import { UnlockWallet } from './components/UnlockWallet';
import { WalletDashboard } from './components/WalletDashboard';
import { Printer as Prism } from 'lucide-react';
import { SolanaUtils } from './utils/solana';

function App() {
  const {
    walletState,
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
    switchNetwork,
    getCurrentAccount,
    selectAccount,
    renameAccount,
    removeAccount
  } = useWallet();

  const [setupMode, setSetupMode] = useState<'welcome' | 'create' | 'import'>('welcome');

  const estimateFee = async (from: string, to: string) => {
    return SolanaUtils.estimateTransferFee(from, to, walletState.network);
  };

  // If wallet is locked, show unlock screen
  if (walletState.accounts.length > 0 && walletState.isLocked) {
    return (
      <div className="w-80 h-96 bg-white">
        <UnlockWallet onUnlock={unlockWallet} loading={loading} onForgotPassword={() => setSetupMode('import')} />
      </div>
    );
  }

  // If wallet is unlocked, show dashboard
  if (walletState.accounts.length > 0 && !walletState.isLocked) {
    const currentAccount = getCurrentAccount();
    if (currentAccount) {
      return (
        <div className="w-80 h-96 bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <WalletDashboard
              account={currentAccount}
              accounts={walletState.accounts}
              currentAccountId={walletState.currentAccountId}
              balance={balance}
              tokenBalances={tokenBalances}
              network={walletState.network}
              loading={loading}
              onRefresh={() => { refreshBalances(); refreshRecentTransactions(); }}
              onLockWallet={lockWallet}
              onSwitchNetwork={switchNetwork}
              onSendSOL={sendSOL}
              onSelectAccount={(id) => selectAccount(id)}
              recentTransactions={recentTransactions}
              onEstimateFee={estimateFee}
              onAirdrop={(amount) => airdropDevnet(amount)}
              onExportSecretKey={() => exportSecretKey()}
              onImportPrivateKey={importPrivateKey}
              onSwap={(inMint, outMint, amountUi, inDec, slippageBps) => swapTokens(inMint, outMint, amountUi, inDec, slippageBps)}
              onStartCreateWallet={() => setSetupMode('create')}
              onRenameAccount={renameAccount}
              onRemoveAccount={removeAccount}
            />
          </div>
        </div>
      );
    }
  }

  // Show setup screens
  if (setupMode === 'create') {
    return (
      <div className="w-80 h-96 bg-white overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSetupMode('welcome')}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </div>
          <CreateWallet onCreateWallet={createWallet} loading={loading} />
        </div>
      </div>
    );
  }

  if (setupMode === 'import') {
    return (
      <div className="w-80 h-96 bg-white overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSetupMode('welcome')}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </div>
          <ImportWallet onImportWallet={importWallet} onImportPrivateKey={importPrivateKey} loading={loading} />
        </div>
      </div>
    );
  }

  // Welcome screen
  return (
    <div className="w-80 h-96 bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Prism className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Prism Wallet
          </h1>
          <p className="text-sm text-gray-600">
            Beautiful Solana wallet with spectrum-inspired design
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => setSetupMode('create')}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Create New Wallet
          </button>
          
          <button
            onClick={() => setSetupMode('import')}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Import Existing Wallet
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Secure • Non-custodial • Open Source
        </p>
      </div>
    </div>
  );
}

export default App;