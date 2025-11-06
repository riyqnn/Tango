import { SupportedWallet, WalletId } from '@txnlab/use-wallet-react'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

// Network configuration
export const NETWORK = getAlgodConfigFromViteEnvironment().network

// Supported wallets configuration
export const getSupportedWallets = (): SupportedWallet[] => {
  if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
    const kmdConfig = getKmdConfigFromViteEnvironment()
    return [
      {
        id: WalletId.KMD,
        options: {
          baseServer: kmdConfig.server,
          token: String(kmdConfig.token),
          port: String(kmdConfig.port),
        },
      },
    ]
  } else {
    return [
      { id: WalletId.DEFLY },
      { id: WalletId.PERA },
      { id: WalletId.EXODUS },
      // WalletConnect can be added here if needed
      // {
      //   id: WalletId.WALLETCONNECT,
      //   options: {
      //     projectId: 'your-walletconnect-project-id',
      //     relayUrl: 'wss://relay.walletconnect.com',
      //   }
      // }
    ]
  }
}

// Wallet metadata
export const WALLET_METADATA = {
  [WalletId.DEFLY]: {
    name: 'Defly Wallet',
    description: 'Secure and easy-to-use Algorand wallet',
    icon: '/wallets/defly-icon.png'
  },
  [WalletId.PERA]: {
    name: 'Pera Wallet',
    description: 'Popular Algorand mobile wallet',
    icon: '/wallets/pera-icon.png'
  },
  [WalletId.EXODUS]: {
    name: 'Exodus Wallet',
    description: 'Multi-cryptocurrency wallet with Algorand support',
    icon: '/wallets/exodus-icon.png'
  },
  [WalletId.KMD]: {
    name: 'LocalNet KMD',
    description: 'Development wallet for local testing',
    icon: '/wallets/kmd-icon.png'
  }
}

// Wallet connection states
export const WALLET_CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
}

// Wallet error messages
export const WALLET_ERROR_MESSAGES = {
  NOT_INSTALLED: 'Wallet is not installed',
  CONNECTION_FAILED: 'Failed to connect to wallet',
  DISCONNECTION_FAILED: 'Failed to disconnect wallet',
  NETWORK_MISMATCH: 'Wallet network mismatch',
  INSUFFICIENT_FUNDS: 'Insufficient funds in wallet',
  TRANSACTION_REJECTED: 'Transaction was rejected',
  INVALID_NETWORK: 'Invalid network configuration'
}

// Wallet features
export const WALLET_FEATURES = {
  STANDARD_TRANSACTIONS: 'standard_transactions',
  APP_CALLS: 'app_calls',
  ASSET_TRANSACTIONS: 'asset_transactions',
  GROUP_TRANSACTIONS: 'group_transactions',
  MULTISIG: 'multisig',
  LEDGER: 'ledger'
}

// Default wallet settings
export const DEFAULT_WALLET_SETTINGS = {
  autoConnect: false,
  signTransactions: true,
  showNetworkWarning: true,
  minBalance: 100000, // 0.1 ALGO
  maxTxnFee: 1000000, // 1 ALGO
}
