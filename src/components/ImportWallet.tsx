import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ImportWalletProps {
  onImportWallet: (mnemonic: string, password: string, accountName: string) => Promise<void>;
  onImportPrivateKey?: (secret: string, password: string, accountName: string) => Promise<void>;
  loading: boolean;
}

export const ImportWallet: React.FC<ImportWalletProps> = ({ onImportWallet, onImportPrivateKey, loading }) => {
  const [mnemonic, setMnemonic] = useState('');
  const [secret, setSecret] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountName, setAccountName] = useState('Imported Account');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'mnemonic' | 'privateKey'>('mnemonic');

  const handleImportWallet = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    if (mode === 'mnemonic') {
      if (!mnemonic.trim()) {
        alert('Please enter your recovery phrase');
        return;
      }
      try {
        await onImportWallet(mnemonic.trim(), password, accountName);
      } catch (error) {
        alert('Failed to import wallet. Please check your recovery phrase and try again.');
      }
      return;
    }
    if (mode === 'privateKey') {
      if (!secret.trim()) {
        alert('Please paste your secret key');
        return;
      }
      if (!onImportPrivateKey) {
        alert('Private key import is not available');
        return;
      }
      try {
        await onImportPrivateKey(secret.trim(), password, accountName);
      } catch (error) {
        alert('Failed to import private key. Please check the format and try again.');
      }
      return;
    }
  };

  const handleMnemonicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Clean up the input - remove extra spaces and ensure single spaces between words
    const cleanedValue = e.target.value
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    setMnemonic(cleanedValue);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Import Existing Wallet</h2>
        <p className="text-sm text-gray-600">Choose a method and provide the details</p>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-lg">
        <button onClick={() => setMode('mnemonic')} className={`flex-1 py-2 text-sm rounded-md ${mode === 'mnemonic' ? 'bg-white shadow-sm' : ''}`}>Mnemonic</button>
        <button onClick={() => setMode('privateKey')} className={`flex-1 py-2 text-sm rounded-md ${mode === 'privateKey' ? 'bg-white shadow-sm' : ''}`}>Private Key</button>
      </div>

      <div className="space-y-4">
        {mode === 'mnemonic' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recovery Phrase
            </label>
            <textarea
              value={mnemonic}
              onChange={handleMnemonicChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Enter your 12-word recovery phrase separated by spaces"
            />
            <p className="text-xs text-gray-500 mt-1">
              Words: {mnemonic.split(' ').filter(word => word.length > 0).length}/12
            </p>
          </div>
        )}
        {mode === 'privateKey' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secret Key
            </label>
            <textarea
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Paste Base58, hex, or JSON array (64 numbers)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported: Base58 (most wallets), hex string, or JSON [..64 numbers..]
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Name
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter account name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Create a password for this wallet"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Confirm your password"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Security:</strong> Your recovery phrase or secret key will be encrypted and stored securely in your browser. 
            Never share them with anyone.
          </p>
        </div>
      </div>

      <button
        onClick={handleImportWallet}
        disabled={
          loading || 
          !password || 
          !confirmPassword || 
          !accountName ||
          (mode === 'mnemonic' && mnemonic.split(' ').filter(word => word.length > 0).length !== 12) ||
          (mode === 'privateKey' && !secret.trim())
        }
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Importing Wallet...' : 'Import Wallet'}
      </button>
    </div>
  );
};