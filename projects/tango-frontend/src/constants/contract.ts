// Contract configuration
// These values need to be updated after deploying your smart contract
export const CONTRACT_CONFIG = {
  // Replace with your actual deployed contract app ID
  appId: Number(import.meta.env.VITE_CONTRACT_APP_ID) || 748969226,

  // Replace with your actual contract app address (calculated after deployment)
  appAddress: import.meta.env.VITE_CONTRACT_APP_ADDRESS || 'DHGTKVJVMIJ3KZHUXQFJTJK3CZ5ULIWIV2VJIKFGIA44E4PKGVDM4JAZPY',

  // Contract ABI - Full ABI Contract object for method calls
  contract: {
    name: "Tango",
    desc: "Rock Paper Scissors PvP Game",
    methods: [
      {
        name: "create_game",
        desc: "Create a new game and return the game ID",
        args: [],
        returns: { type: "uint64", desc: "Game ID" }
      },
      {
        name: "join_game",
        desc: "Join an existing game as player 2",
        args: [{ type: "uint64", name: "game_id", desc: "Game ID to join" }],
        returns: { type: "string", desc: "Success message" }
      },
      {
        name: "submit_move",
        desc: "Submit your move (1=Rock, 2=Paper, 3=Scissors)",
        args: [
          { type: "uint64", name: "game_id", desc: "Game ID" },
          { type: "uint64", name: "move", desc: "Move: 1=Rock, 2=Paper, 3=Scissors" }
        ],
        returns: { type: "string", desc: "Game result or waiting message" }
      },
      {
        name: "get_game",
        desc: "Get game details by ID",
        args: [{ type: "uint64", name: "game_id", desc: "Game ID" }],
        returns: { type: "(address,address,uint64,uint64,uint64,address)", desc: "Game struct" }
      },
      {
        name: "get_game_status",
        desc: "Get human-readable game status",
        args: [{ type: "uint64", name: "game_id", desc: "Game ID" }],
        returns: { type: "string", desc: "Status message" }
      },
      {
        name: "_determine_winner",
        desc: "Internal method to determine the winner",
        args: [{ type: "uint64", name: "game_id", desc: "Game ID" }],
        returns: { type: "string", desc: "Winner message" }
      },
      {
        name: "get_winner",
        desc: "Get the winner of a finished game",
        args: [{ type: "uint64", name: "game_id", desc: "Game ID" }],
        returns: { type: "address", desc: "Winner address" }
      },
      {
        name: "transfer_ownership",
        desc: "Transfer contract ownership",
        args: [{ type: "address", name: "new_owner", desc: "New owner address" }],
        returns: { type: "string", desc: "Success message" }
      }
    ]
  },

  // Contract ABI methods (Rock-Paper-Scissors Game)
  methods: {
    createGame: 'create_game',
    joinGame: 'join_game',
    submitMove: 'submit_move',
    getGame: 'get_game',
    getGameStatus: 'get_game_status',
    determineWinner: '_determine_winner',
    getWinner: 'get_winner',
    transferOwnership: 'transfer_ownership'
  },

  // Box storage prefix for games
  boxPrefix: 'games',

  // Schema (for deployment tools)
  globalInts: 1,
  globalBytes: 1,
  localInts: 0,
  localBytes: 0
}

// Game status enum (for UI clarity)
export const GAME_STATUS = {
  WAITING: 0,
  ONGOING: 1,
  FINISHED: 2
} as const

export const GAME_STATUS_LABEL: Record<number, string> = {
  0: 'Waiting for Player 2',
  1: 'Game in Progress',
  2: 'Game Finished'
}

// Move options
export const MOVE = {
  NONE: 0,
  ROCK: 1,
  PAPER: 2,
  SCISSORS: 3
} as const

export const MOVE_LABEL: Record<number, string> = {
  0: 'None',
  1: 'Rock',
  2: 'Paper',
  3: 'Scissors'
}

// Network configuration
export const NETWORK_CONFIG = {
  TESTNET: {
    name: 'TestNet',
    algodServer: 'https://testnet-api.algonode.cloud',
    algodPort: '',
    algodToken: '',
    indexerServer: 'https://testnet-idx.algonode.cloud',
    indexerPort: '',
    indexerToken: ''
  },
  MAINNET: {
    name: 'MainNet',
    algodServer: 'https://mainnet-api.algonode.cloud',
    algodPort: '',
    algodToken: '',
    indexerServer: 'https://mainnet-idx.algonode.cloud',
    indexerPort: '',
    indexerToken: ''
  },
  LOCALNET: {
    name: 'LocalNet',
    algodServer: 'http://localhost',
    algodPort: '4001',
    algodToken: 'a'.repeat(64),
    indexerServer: 'http://localhost',
    indexerPort: '8980',
    indexerToken: ''
  }
}

// Transaction fees and limits (in microAlgos)
export const TRANSACTION_FEES = {
  MIN_FEE: 1000, // 0.001 ALGO
  APP_CALL_FEE: 1000,
  BOX_ACCESS_FEE: 400, // Per box read/write
  MIN_ACCOUNT_BALANCE: 100000, // 0.1 ALGO
  MIN_APP_BALANCE: 100000, // Base app balance
  MIN_BOX_BALANCE: 28500 // Per box (0.0285 ALGO)
}

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete this transaction',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  CONTRACT_NOT_FOUND: 'Contract not found. Please check the app ID.',
  NOT_AUTHORIZED: 'You are not authorized to perform this action',
  INVALID_GAME_ID: 'Invalid game ID',
  GAME_NOT_FOUND: 'Game not found or does not exist',
  GAME_FULL: 'This game already has two players',
  GAME_NOT_WAITING: 'Game is not waiting for a player',
  GAME_ALREADY_STARTED: 'Game has already started',
  GAME_FINISHED: 'Game is already finished',
  INVALID_MOVE: 'Invalid move. Choose Rock, Paper, or Scissors.',
  MOVE_ALREADY_SUBMITTED: 'You have already submitted your move',
  SAME_PLAYER: 'Cannot play against yourself',
  INVALID_ADDRESS: 'Invalid address format'
}

// Success messages
export const SUCCESS_MESSAGES = {
  GAME_CREATED: 'Game created! Share the Game ID with your opponent.',
  GAME_JOINED: 'Successfully joined the game!',
  MOVE_SUBMITTED: 'Move submitted! Waiting for opponent...',
  GAME_FINISHED: 'Game over! Check the result.',
  WALLET_CONNECTED: 'Wallet connected successfully!',
  TRANSACTION_SENT: 'Transaction sent successfully!',
  OWNERSHIP_TRANSFERRED: 'Ownership transferred successfully!'
}
