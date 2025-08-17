export interface WalletIcon {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  description: string;
}

export const WALLET_ICONS: WalletIcon[] = [
  {
    id: 'default',
    name: 'Default',
    emoji: '👤',
    gradient: 'from-purple-500 to-pink-500',
    description: 'Classic wallet icon'
  },
  {
    id: 'doge',
    name: 'Doge',
    emoji: '🐕',
    gradient: 'from-yellow-400 to-orange-500',
    description: 'Much wow, very crypto'
  },
  {
    id: 'pepe',
    name: 'Pepe',
    emoji: '🐸',
    gradient: 'from-green-400 to-emerald-500',
    description: 'Rare pepe vibes'
  },
  {
    id: 'rocket',
    name: 'Rocket',
    emoji: '🚀',
    gradient: 'from-blue-500 to-purple-600',
    description: 'To the moon!'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    emoji: '💎',
    gradient: 'from-pink-500 to-red-500',
    description: 'Diamond hands'
  },
  {
    id: 'brain',
    name: 'Brain',
    emoji: '🧠',
    gradient: 'from-purple-600 to-indigo-600',
    description: 'Big brain moves'
  },
  {
    id: 'fire',
    name: 'Fire',
    emoji: '🔥',
    gradient: 'from-red-500 to-orange-500',
    description: 'Hot wallet'
  },
  {
    id: 'crown',
    name: 'Crown',
    emoji: '👑',
    gradient: 'from-yellow-500 to-orange-400',
    description: 'King of crypto'
  },
  {
    id: 'alien',
    name: 'Alien',
    emoji: '👽',
    gradient: 'from-green-500 to-teal-500',
    description: 'Out of this world'
  },
  {
    id: 'ninja',
    name: 'Ninja',
    emoji: '🥷',
    gradient: 'from-gray-700 to-black',
    description: 'Stealth mode'
  },
  {
    id: 'wizard',
    name: 'Wizard',
    emoji: '🧙‍♂️',
    gradient: 'from-purple-700 to-indigo-800',
    description: 'Magic money'
  },
  {
    id: 'robot',
    name: 'Robot',
    emoji: '🤖',
    gradient: 'from-blue-600 to-cyan-500',
    description: 'AI powered'
  },
  {
    id: 'ghost',
    name: 'Ghost',
    emoji: '👻',
    gradient: 'from-gray-400 to-white',
    description: 'Spooky gains'
  },
  {
    id: 'unicorn',
    name: 'Unicorn',
    emoji: '🦄',
    gradient: 'from-pink-400 to-purple-400',
    description: 'Rare and magical'
  },
  {
    id: 'dragon',
    name: 'Dragon',
    emoji: '🐉',
    gradient: 'from-red-600 to-orange-600',
    description: 'Fierce trader'
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    emoji: '🦅',
    gradient: 'from-orange-500 to-red-600',
    description: 'Rising from ashes'
  },
  {
    id: 'shark',
    name: 'Shark',
    emoji: '🦈',
    gradient: 'from-blue-700 to-gray-800',
    description: 'Shark tank'
  },
  {
    id: 'owl',
    name: 'Owl',
    emoji: '🦉',
    gradient: 'from-amber-600 to-brown-600',
    description: 'Wise investor'
  },
  {
    id: 'tiger',
    name: 'Tiger',
    emoji: '🐯',
    gradient: 'from-orange-600 to-yellow-500',
    description: 'Fierce and bold'
  },
  {
    id: 'eagle',
    name: 'Eagle',
    emoji: '🦅',
    gradient: 'from-brown-600 to-amber-500',
    description: 'Eagle eye view'
  }
];

export const getWalletIcon = (iconId: string): WalletIcon => {
  return WALLET_ICONS.find(icon => icon.id === iconId) || WALLET_ICONS[0];
};

export const getRandomWalletIcon = (): WalletIcon => {
  const randomIndex = Math.floor(Math.random() * WALLET_ICONS.length);
  return WALLET_ICONS[randomIndex];
}; 