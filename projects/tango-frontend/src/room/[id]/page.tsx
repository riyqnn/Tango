import { useState, useEffect, useMemo } from "react";

// ============================================================================
// MOCK DATA & CONSTANTS
// ============================================================================

const GAME_STATUS = {
  WAITING: 0,
  ONGOING: 1,
  FINISHED: 2,
};

const MOVE_LABEL: { [key: number]: string } = {
  0: "Not Submitted",
  1: "Rock",
  2: "Paper",
  3: "Scissors",
};

// Mock game data - ubah ini untuk simulasi berbeda
const MOCK_GAMES: { [key: number]: any } = {
  1: {
    player1: "PLAYER1ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    player2: "PLAYER2ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    status: GAME_STATUS.ONGOING,
    move1: 1, // Rock
    move2: 0, // Not submitted
  },
  2: {
    player1: "PLAYER1ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    player2: "PLAYER2ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    status: GAME_STATUS.FINISHED,
    move1: 1, // Rock
    move2: 3, // Scissors
  },
  3: {
    player1: "PLAYER1ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    player2: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
    status: GAME_STATUS.WAITING,
    move1: 0,
    move2: 0,
  },
};

// Mock current user address (ubah ini untuk simulasi player berbeda)
const MOCK_USER_ADDRESS = "PLAYER1ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";

// ============================================================================
// UI COMPONENTS
// ============================================================================

const Button = ({
  children,
  onClick,
  disabled,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${className} ${
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    }`}
    {...props}
  >
    {children}
  </button>
);

const Card = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string
}) => (
  <div className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${className}`}>
    {children}
  </div>
);

const CardHeader = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string
}) => (
  <div className={`border-b-4 border-black p-6 ${className}`}>{children}</div>
);

const CardTitle = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string
}) => (
  <h3 className={`text-3xl font-black text-black uppercase ${className}`}>
    {children}
  </h3>
);

const CardContent = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string
}) => (
  <div className={`p-6 space-y-4 ${className}`}>{children}</div>
);

// ============================================================================
// MAIN ROOM COMPONENT
// ============================================================================

export default function Room() {
  // Simulasi game ID dari URL (bisa diubah untuk testing)
  const [currentGameId, setCurrentGameId] = useState(1);

  const [gameData, setGameData] = useState<any>(null);
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);

  const activeAddress = MOCK_USER_ADDRESS;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatAddress = (addr: string): string => {
    if (!addr || addr === "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ") {
      return "Waiting...";
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getMoveName = (move: number): string => {
    if (move === 0) return "Not Submitted";
    return MOVE_LABEL[move] || "Unknown";
  };

  // Move options
  const moves = [
    { id: 1, name: "Rock", emoji: "🪨" },
    { id: 2, name: "Paper", emoji: "📄" },
    { id: 3, name: "Scissors", emoji: "✂️" },
  ];

  // ============================================================================
  // MOCK DATA FETCHING
  // ============================================================================

  const fetchGameData = () => {
    const game = MOCK_GAMES[currentGameId];

    if (!game) {
      setError("Game not found");
      setGameStatus("Game not found");
      setGameData(null);
      return;
    }

    setError(null);
    setGameData(game);

    // Update status message
    if (game.status === GAME_STATUS.WAITING) {
      setGameStatus("Waiting for Player 2");
    } else if (game.status === GAME_STATUS.ONGOING) {
      setGameStatus("Game in Progress");
    } else if (game.status === GAME_STATUS.FINISHED) {
      setGameStatus("Game Finished");
    } else {
      setGameStatus("Unknown Status");
    }
  };

  useEffect(() => {
    fetchGameData();
  }, [currentGameId]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSubmitMove = () => {
    if (selectedMove === null) {
      alert("Please select a move first!");
      return;
    }

    setLoading(true);

    // Simulasi delay network
    setTimeout(() => {
      alert(`✅ Move submitted: ${moves.find(m => m.id === selectedMove)?.name}`);

      // Update mock data
      if (gameData) {
        const updatedGame = { ...gameData };
        if (isPlayer1) {
          updatedGame.move1 = selectedMove;
        } else if (isPlayer2) {
          updatedGame.move2 = selectedMove;
        }
        setGameData(updatedGame);
      }

      setSelectedMove(null);
      setLoading(false);
    }, 1000);
  };

  const handleRandomMove = () => {
    const randomMove = Math.floor(Math.random() * 3) + 1;
    setSelectedMove(randomMove);
  };

  const handleBackToLobby = () => {
    alert("Back to lobby (mock)");
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isPlayer1 = useMemo(
    () => activeAddress?.toLowerCase() === gameData?.player1.toLowerCase(),
    [activeAddress, gameData?.player1]
  );

  const isPlayer2 = useMemo(
    () => activeAddress?.toLowerCase() === gameData?.player2.toLowerCase(),
    [activeAddress, gameData?.player2]
  );

  const isPlayer = isPlayer1 || isPlayer2;

  const myMove = isPlayer1 ? gameData?.move1 : gameData?.move2;
  const opponentMove = isPlayer1 ? gameData?.move2 : gameData?.move1;

  const canSubmitMove =
    isPlayer &&
    gameData?.status === GAME_STATUS.ONGOING &&
    myMove === 0;

  const gameResult = useMemo(() => {
    if (!gameData || gameData.status !== GAME_STATUS.FINISHED) return null;

    const { move1, move2 } = gameData;

    // Draw condition
    if (move1 === move2) return "DRAW";

    // Win conditions: [winner_move, loser_move]
    const winConditions = [
      [1, 3], // Rock beats Scissors
      [2, 1], // Paper beats Rock
      [3, 2], // Scissors beats Paper
    ];

    const player1Wins = winConditions.some(
      ([m1, m2]) => move1 === m1 && move2 === m2
    );

    if (isPlayer1) {
      return player1Wins ? "WIN" : "LOSE";
    } else if (isPlayer2) {
      return player1Wins ? "LOSE" : "WIN";
    }

    return null;
  }, [gameData, isPlayer1, isPlayer2]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Mock Game Selector */}
        <div className="mb-8 bg-yellow-100 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black uppercase mb-2">🎭 Mock Mode - Select Game:</p>
          <div className="flex gap-2">
            {[1, 2, 3].map(id => (
              <Button
                key={id}
                onClick={() => setCurrentGameId(id)}
                className={`px-4 py-2 border-2 border-black font-bold ${
                  currentGameId === id
                    ? 'bg-green-400'
                    : 'bg-white'
                }`}
              >
                Game #{id}
              </Button>
            ))}
          </div>
          <p className="text-sm mt-2">
            Game 1: Ongoing | Game 2: Finished (Win) | Game 3: Waiting
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-8">
          <Button
            onClick={handleBackToLobby}
            className="bg-gradient-to-br from-gray-300 to-gray-400 text-black border-4 border-black px-8 py-4 text-lg font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            ← Back to Lobby
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-block bg-gradient-to-br from-purple-400 to-pink-400 border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-4">
            <h1 className="text-6xl font-black text-black uppercase tracking-tight">
              Game #{currentGameId}
            </h1>
          </div>
          <p className="text-2xl font-bold text-gray-700 uppercase tracking-wide">
            {gameStatus}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-12 border-red-500">
            <CardContent className="text-center p-12">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-2xl font-black uppercase text-red-600 mb-4">
                Error
              </p>
              <p className="text-lg font-bold text-gray-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Game Status Card */}
        {gameData && !error && (
          <Card className="mb-12">
            <CardHeader className="bg-gradient-to-br from-cyan-300 to-blue-300">
              <CardTitle>Game Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Player 1 */}
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-sm font-black uppercase text-gray-600 mb-2">
                    Player 1 {isPlayer1 && "(You)"}
                  </p>
                  <p className="text-lg font-bold text-black break-all mb-3">
                    {formatAddress(gameData.player1)}
                  </p>
                  <div className="bg-white border-2 border-black p-3">
                    <p className="text-sm font-bold">
                      Move: {getMoveName(gameData.move1)}
                    </p>
                  </div>
                </div>

                {/* Player 2 */}
                <div className="bg-gradient-to-br from-yellow-100 to-orange-100 border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-sm font-black uppercase text-gray-600 mb-2">
                    Player 2 {isPlayer2 && "(You)"}
                  </p>
                  <p className="text-lg font-bold text-black break-all mb-3">
                    {formatAddress(gameData.player2)}
                  </p>
                  <div className="bg-white border-2 border-black p-3">
                    <p className="text-sm font-bold">
                      Move: {getMoveName(gameData.move2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Game Result */}
              {gameResult && (
                <div className="mt-6 text-center">
                  <div
                    className={`inline-block border-4 border-black p-8 text-4xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
                      gameResult === "WIN"
                        ? "bg-gradient-to-br from-green-300 to-emerald-300"
                        : gameResult === "LOSE"
                        ? "bg-gradient-to-br from-red-300 to-pink-300"
                        : "bg-gradient-to-br from-gray-300 to-slate-300"
                    }`}
                  >
                    {gameResult === "WIN"
                      ? "🎉 YOU WIN!"
                      : gameResult === "LOSE"
                      ? "😔 YOU LOSE!"
                      : "🤝 DRAW!"}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Move Selection */}
        {canSubmitMove && (
          <Card className="mb-12">
            <CardHeader className="bg-gradient-to-br from-pink-300 to-purple-300">
              <CardTitle>Choose Your Move</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                {moves.map((move) => (
                  <Button
                    key={move.id}
                    onClick={() => setSelectedMove(move.id)}
                    className={`relative aspect-square bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                      selectedMove === move.id
                        ? "bg-gradient-to-br from-yellow-200 to-orange-200 translate-x-1 translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="text-6xl mb-3">{move.emoji}</div>
                      <p className="text-xl font-black uppercase">{move.name}</p>
                    </div>
                  </Button>
                ))}

                {/* Random Button */}
                <Button
                  onClick={handleRandomMove}
                  className="relative aspect-square bg-gradient-to-br from-purple-200 to-pink-200 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-6xl mb-3">🎲</div>
                    <p className="text-xl font-black uppercase">Random</p>
                  </div>
                </Button>
              </div>

              {/* Selected Move Display */}
              {selectedMove !== null && (
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
                  <p className="text-2xl font-black text-center uppercase">
                    Selected: {moves.find((m) => m.id === selectedMove)?.name || "Unknown"}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmitMove}
                disabled={!selectedMove || loading}
                className="w-full bg-gradient-to-br from-green-400 to-emerald-400 text-black border-4 border-black py-8 text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Move"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Waiting Message */}
        {!canSubmitMove && gameData && gameData.status !== GAME_STATUS.FINISHED && !error && (
          <Card className="mb-12">
            <CardContent className="text-center p-12">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-3xl font-black uppercase text-gray-700">
                {!isPlayer
                  ? "Spectating..."
                  : myMove !== 0
                  ? "Waiting for opponent..."
                  : "Game is full"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Spectator Mode */}
        {!isPlayer && gameData && !error && (
          <Card>
            <CardContent className="text-center p-12">
              <div className="text-6xl mb-4">👀</div>
              <p className="text-3xl font-black uppercase text-gray-700 mb-4">
                Spectator Mode
              </p>
              <p className="text-xl font-bold text-gray-600">
                You are watching this game
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
