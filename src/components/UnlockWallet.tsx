import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface UnlockWalletProps {
  onUnlock: (password: string) => Promise<boolean>;
  loading: boolean;
}

export const UnlockWallet: React.FC<UnlockWalletProps> = ({ onUnlock, loading }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Please enter your password');
      return;
    }

    const success = await onUnlock(password);
    if (!success) {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full space-y-6 p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Unlock Prism Wallet</h2>
        <p className="text-sm text-gray-600">Enter your password to access your wallet</p>
      </div>

      <form onSubmit={handleUnlock} className="w-full max-w-sm space-y-4">
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
              placeholder="Enter your password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Unlocking...' : 'Unlock Wallet'}
        </button>
      </form>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Forgot your password? You'll need to import your wallet using your recovery phrase.
        </p>
      </div>
    </div>
  );
};