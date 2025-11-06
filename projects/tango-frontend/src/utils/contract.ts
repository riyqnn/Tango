import algosdk, { TransactionSigner } from 'algosdk'
import { getAlgodConfigFromViteEnvironment } from './network/getAlgoClientConfigs'
import toast from 'react-hot-toast'

// Initialize Algod client with environment config
const algodConfig = getAlgodConfigFromViteEnvironment()
const algodClient = new algosdk.Algodv2(
  algodConfig.token as string,
  algodConfig.server,
  algodConfig.port
)

// Contract configuration - UPDATE WITH YOUR DEPLOYED APP ID
const CONTRACT_CONFIG = {
  appId: 748969226, // Replace with your actual deployed app ID
  appAddress: 'DHGTKVJVMIJ3KZHUXQFJTJK3CZ5ULIWIV2VJIKFGIA44E4PKGVDM4JAZPY',
  approvalProgram: '', // Optional: for reference
  clearProgram: '',
  globalInts: 1,
  globalBytes: 1,
  localInts: 0,
  localBytes: 0
}

// Game struct from ABI
export interface Game {
  player1: string
  player2: string
  move1: number
  move2: number
  status: number // 0=Waiting, 1=Ongoing, 2=Finished
  winner: string
}

export interface TangoContractMethods {
  gameCounter: number
  owner: string
}

/**
 * Get contract application information
 */
export async function getApplicationInfo(appId: number) {
  try {
    const appInfo = await algodClient.getApplicationByID(appId).do()
    return appInfo
  } catch (error: any) {
    console.error('Error getting application info:', error)
    throw new Error(`Failed to get application info: ${error.message}`)
  }
}

/**
 * Read global state from the contract
 */
export async function readContractGlobalState(): Promise<Partial<TangoContractMethods>> {
  try {
    if (!CONTRACT_CONFIG.appId) {
      throw new Error('Contract app ID not configured')
    }
    const appInfo = await getApplicationInfo(CONTRACT_CONFIG.appId)
    const globalState = appInfo.params['global-state'] || []
    const state: Partial<TangoContractMethods> = {}

    globalState.forEach((item: any) => {
      const key = Buffer.from(item.key, 'base64').toString('utf-8')
      const value = item.value
      switch (key) {
        case 'owner':
          if (value.bytes) {
            state.owner = algosdk.encodeAddress(Buffer.from(value.bytes, 'base64'))
          }
          break
        case 'game_counter':
          state.gameCounter = value.uint
          break
      }
    })
    return state
  } catch (error: any) {
    console.error('Error reading contract global state:', error)
    throw new Error(`Failed to read contract state: ${error.message}`)
  }
}

/**
 * Create a method call transaction (ABI-style)
 */
export async function createMethodCallTxn(
  sender: string,
  appIndex: number,
  methodName: string,
  args: any[] = []
): Promise<algosdk.Transaction> {
  try {
    const suggestedParams = await algodClient.getTransactionParams().do()

    // ABI method definitions
    const methodDefs = [
      { name: 'create_game', args: [], returns: { type: 'uint64' } },
      { name: 'join_game', args: [{ type: 'uint64' }], returns: { type: 'void' } },
      { name: 'submit_move', args: [{ type: 'uint64' }, { type: 'uint64' }], returns: { type: 'void' } },
      { name: 'get_game', args: [{ type: 'uint64' }], returns: { type: '(address,address,uint64,uint64,uint64,address)' } },
      { name: 'get_game_status', args: [{ type: 'uint64' }], returns: { type: 'uint64' } },
      { name: 'get_winner', args: [{ type: 'uint64' }], returns: { type: 'address' } },
      { name: 'transfer_ownership', args: [{ type: 'address' }], returns: { type: 'void' } }
    ]

    const method = algosdk.getMethodByName(methodDefs, methodName)

    // Encode arguments properly
    const appArgs: Uint8Array[] = [method.getSelector()]
    args.forEach((arg, i) => {
      const argType = method.args[i].type.toString()
      if (argType === 'uint64') {
        appArgs.push(algosdk.encodeUint64(arg))
      } else if (argType === 'address') {
        const addr = typeof arg === 'string' ? algosdk.decodeAddress(arg).publicKey : arg
        appArgs.push(addr)
      }
    })

    // Add boxes if accessing game data
    const boxes: algosdk.BoxReference[] = []
    if (['join_game', 'submit_move', 'get_game', 'get_game_status', 'get_winner'].includes(methodName) && args.length > 0) {
      const gameId = args[0]
      const boxName = new Uint8Array([
        ...Buffer.from('games'),
        ...algosdk.encodeUint64(gameId)
      ])
      boxes.push({ appIndex, name: boxName })
    }

    return algosdk.makeApplicationCallTxnFromObject({
      sender,
      appIndex,
      appArgs,
      boxes: boxes.length > 0 ? boxes : undefined,
      suggestedParams,
      onComplete: algosdk.OnApplicationComplete.NoOpOC
    })
  } catch (error: any) {
    console.error('Error creating method call transaction:', error)
    throw new Error(`Failed to create transaction: ${error.message}`)
  }
}

/**
 * Create Game
 */
export async function createGame(
  signer: { addr: string; signer: TransactionSigner }
): Promise<Uint8Array> {
  try {
    const tx = await createMethodCallTxn(signer.addr, CONTRACT_CONFIG.appId, 'create_game', [])
    const signedTx = await signer.signer([tx], [0])
    return signedTx[0]
  } catch (error: any) {
    console.error('Error creating game:', error)
    throw new Error(`Failed to create game: ${error.message}`)
  }
}

/**
 * Join Game
 */
export async function joinGame(
  signer: { addr: string; signer: TransactionSigner },
  gameId: number
): Promise<Uint8Array> {
  try {
    const tx = await createMethodCallTxn(signer.addr, CONTRACT_CONFIG.appId, 'join_game', [gameId])
    const signedTx = await signer.signer([tx], [0])
    return signedTx[0]
  } catch (error: any) {
    console.error('Error joining game:', error)
    throw new Error(`Failed to join game: ${error.message}`)
  }
}

/**
 * Submit Move (1=Rock, 2=Paper, 3=Scissors)
 */
export async function submitMove(
  signer: { addr: string; signer: TransactionSigner },
  gameId: number,
  move: number
): Promise<Uint8Array> {
  if (move < 1 || move > 3) {
    throw new Error('Invalid move. Use 1=Rock, 2=Paper, 3=Scissors')
  }
  try {
    const tx = await createMethodCallTxn(signer.addr, CONTRACT_CONFIG.appId, 'submit_move', [gameId, move])
    const signedTx = await signer.signer([tx], [0])
    return signedTx[0]
  } catch (error: any) {
    console.error('Error submitting move:', error)
    throw new Error(`Failed to submit move: ${error.message}`)
  }
}

/**
 * Get Game Details
 */
export async function getGame(gameId: number): Promise<Game> {
  try {
    const boxName = new Uint8Array([
      ...Buffer.from('games'),
      ...algosdk.encodeUint64(gameId)
    ])

    const box = await algodClient.getApplicationBoxByName(CONTRACT_CONFIG.appId, boxName).do()

    if (!box.value) throw new Error('Game not found')

    const data = box.value
    let offset = 0

    // Parse game data structure: (address,address,uint64,uint64,uint64,address)
    const player1 = algosdk.encodeAddress(data.slice(offset, offset + 32))
    offset += 32
    const player2 = algosdk.encodeAddress(data.slice(offset, offset + 32))
    offset += 32
    const move1 = Number(algosdk.decodeUint64(data.slice(offset, offset + 8), 'safe'))
    offset += 8
    const move2 = Number(algosdk.decodeUint64(data.slice(offset, offset + 8), 'safe'))
    offset += 8
    const status = Number(algosdk.decodeUint64(data.slice(offset, offset + 8), 'safe'))
    offset += 8
    const winner = algosdk.encodeAddress(data.slice(offset, offset + 32))

    return { player1, player2, move1, move2, status, winner }
  } catch (error: any) {
    console.error('Error getting game:', error)
    throw new Error(`Failed to get game ${gameId}: ${error.message}`)
  }
}

/**
 * Get Game Status (human readable)
 */
export async function getGameStatus(gameId: number): Promise<string> {
  try {
    const game = await getGame(gameId)
    switch (game.status) {
      case 0:
        return 'Waiting for player 2'
      case 1:
        return 'Game ongoing'
      case 2:
        return 'Game finished'
      default:
        return 'Unknown'
    }
  } catch (error: any) {
    console.error('Error getting game status:', error)
    throw new Error(`Failed to get game status: ${error.message}`)
  }
}

/**
 * Get Winner
 */
export async function getWinner(gameId: number): Promise<string> {
  try {
    const game = await getGame(gameId)
    if (game.status !== 2) throw new Error('Game not finished yet')

    const zeroAddress = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
    return game.winner === zeroAddress ? 'Draw' : game.winner
  } catch (error: any) {
    console.error('Error getting winner:', error)
    throw new Error(`Failed to get winner: ${error.message}`)
  }
}

/**
 * Transfer Ownership
 */
export async function transferOwnership(
  signer: { addr: string; signer: TransactionSigner },
  newOwner: string
): Promise<Uint8Array> {
  try {
    const tx = await createMethodCallTxn(
      signer.addr,
      CONTRACT_CONFIG.appId,
      'transfer_ownership',
      [newOwner]
    )
    const signedTx = await signer.signer([tx], [0])
    return signedTx[0]
  } catch (error: any) {
    console.error('Error transferring ownership:', error)
    throw new Error(`Failed to transfer ownership: ${error.message}`)
  }
}

/**
 * Send signed transaction
 */
export async function sendTransaction(signedTxn: Uint8Array): Promise<string> {
  try {
    const response = await algodClient.sendRawTransaction(signedTxn).do()
    const txId = response.txId

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4)
    return txId
  } catch (error: any) {
    console.error('Error sending transaction:', error)
    throw new Error(`Transaction failed: ${error.message}`)
  }
}

/**
 * Complete Flows with Toast
 */

export async function startGame(
  signer: { addr: string; signer: TransactionSigner }
): Promise<{ txId: string; gameId: number }> {
  const toastId = toast.loading('Creating game...')
  try {
    const signedTxn = await createGame(signer)
    const txId = await sendTransaction(signedTxn)

    // Get new game ID from global state
    const state = await readContractGlobalState()
    const gameId = state.gameCounter || 0

    toast.success('Game created!', { id: toastId })
    return { txId, gameId }
  } catch (error: any) {
    toast.error(error.message || 'Failed to create game', { id: toastId })
    throw error
  }
}

export async function joinGameFlow(
  signer: { addr: string; signer: TransactionSigner },
  gameId: number
): Promise<string> {
  const toastId = toast.loading('Joining game...')
  try {
    const signedTxn = await joinGame(signer, gameId)
    const txId = await sendTransaction(signedTxn)
    toast.success('Successfully joined game!', { id: toastId })
    return txId
  } catch (error: any) {
    toast.error(error.message || 'Failed to join game', { id: toastId })
    throw error
  }
}

export async function submitMoveFlow(
  signer: { addr: string; signer: TransactionSigner },
  gameId: number,
  move: number
): Promise<string> {
  const toastId = toast.loading('Submitting move...')
  try {
    const signedTxn = await submitMove(signer, gameId, move)
    const txId = await sendTransaction(signedTxn)
    toast.success('Move submitted! Waiting for opponent...', { id: toastId })
    return txId
  } catch (error: any) {
    toast.error(error.message || 'Failed to submit move', { id: toastId })
    throw error
  }
}

export default {
  readContractGlobalState,
  startGame,
  joinGameFlow,
  submitMoveFlow,
  getGame,
  getGameStatus,
  getWinner,
  transferOwnership,
  CONTRACT_CONFIG
}
