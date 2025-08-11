import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Shield } from 'lucide-react';

interface CreateWalletProps {
  onCreateWallet: (password: string, accountName: string) => Promise<string>;
  loading: boolean;
}

export const CreateWallet: React.FC<CreateWalletProps> = ({ onCreateWallet, loading }) => {
  const [step, setStep] = useState<'setup' | 'mnemonic' | 'verify'>('setup');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountName, setAccountName] = useState('Account 1');
  const [showPassword, setShowPassword] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [verificationIndices, setVerificationIndices] = useState<number[]>([]);
  const [verificationAnswers, setVerificationAnswers] = useState<string[]>(['', '', '']);

  const handleCreateWallet = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    try {
      const generatedMnemonic = await onCreateWallet(password, accountName);
      setMnemonic(generatedMnemonic);
      const words = generatedMnemonic.split(' ');
      setMnemonicWords(words);
      
      // Generate random indices for verification
      const indices = [];
      while (indices.length < 3) {
        const randomIndex = Math.floor(Math.random() * words.length);
        if (!indices.includes(randomIndex)) {
          indices.push(randomIndex);
        }
      }
      setVerificationIndices(indices.sort((a, b) => a - b));
      
      setStep('mnemonic');
    } catch (error) {
      alert('Failed to create wallet. Please try again.');
    }
  };

  const handleVerifyMnemonic = () => {
    const isCorrect = verificationIndices.every((index, i) => 
      verificationAnswers[i].trim().toLowerCase() === mnemonicWords[index].toLowerCase()
    );
    
    if (isCorrect) {
      setStep('verify');
      // Wallet creation complete - parent component will handle navigation
    } else {
      alert('Verification failed. Please check your answers.');
      setVerificationAnswers(['', '', '']);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (step === 'verify') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Created Successfully!</h2>
        <p className="text-gray-600 mb-6">Your Prism Wallet is ready to use. Keep your recovery phrase safe!</p>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">
            Remember: Never share your recovery phrase with anyone. Store it in a secure location offline.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'mnemonic') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Save Your Recovery Phrase</h2>
          <p className="text-sm text-gray-600">
            Write down these 12 words in the exact order shown. Keep them safe and private.
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {mnemonicWords.map((word, index) => (
              <div key={index} className="bg-white p-2 rounded text-center text-sm font-medium">
                <span className="text-gray-400 text-xs">{index + 1}.</span>
                <div className="text-gray-800">{word}</div>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => copyToClipboard(mnemonic)}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/50 hover:bg-white/70 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy to Clipboard
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Verify Your Recovery Phrase</h3>
          <p className="text-sm text-gray-600">Please enter the following words to verify you've saved them correctly:</p>
          
          {verificationIndices.map((wordIndex, i) => (
            <div key={i} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Word #{wordIndex + 1}
              </label>
              <input
                type="text"
                value={verificationAnswers[i]}
                onChange={(e) => {
                  const newAnswers = [...verificationAnswers];
                  newAnswers[i] = e.target.value;
                  setVerificationAnswers(newAnswers);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={`Enter word #${wordIndex + 1}`}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleVerifyMnemonic}
          disabled={verificationAnswers.some(answer => !answer.trim())}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          Verify & Complete Setup
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Create New Wallet</h2>
        <p className="text-sm text-gray-600">Set up your Prism Wallet with a secure password</p>
      </div>

      <div className="space-y-4">
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
              placeholder="Create a strong password"
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

        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Important:</strong> Your password encrypts your wallet locally. If you lose it, you'll need your recovery phrase to restore access.
          </p>
        </div>
      </div>

      <button
        onClick={handleCreateWallet}
        disabled={loading || !password || !confirmPassword || !accountName}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Creating Wallet...' : 'Create Wallet'}
      </button>
    </div>
  );
};