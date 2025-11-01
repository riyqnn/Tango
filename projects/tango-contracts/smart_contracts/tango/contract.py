from algopy import ARC4Contract, String, UInt64, Txn, Account, BoxMap
from algopy.arc4 import abimethod, Struct


class Game(Struct):
    player1: Account
    player2: Account
    move1: UInt64
    move2: UInt64
    status: UInt64
    winner: Account


class Tango(ARC4Contract):
    """
    Tango - Rock Paper Scissors PvP Game
    A decentralized Rock Paper Scissors game on Algorand
    
    Move values: 0=None, 1=Rock, 2=Paper, 3=Scissors
    Status values: 0=Waiting, 1=Ongoing, 2=Finished
    """
    
    def __init__(self) -> None:
        self.owner = Txn.sender
        self.game_counter = UInt64(0)
        self.games = BoxMap(UInt64, Game)
    
    @abimethod()
    def create_game(self) -> UInt64:
        """Create a new game and return the game ID"""
        self.game_counter += 1
        game_id = self.game_counter
        
        # Initialize new game
        new_game = Game(
            player1=Txn.sender,
            player2=Account(),
            move1=UInt64(0),  # None
            move2=UInt64(0),  # None
            status=UInt64(0),  # Waiting
            winner=Account()
        )
        
        # Store game in box storage
        self.games[game_id] = new_game.copy()
        
        return game_id
    
    @abimethod()
    def join_game(self, game_id: UInt64) -> String:
        """Join an existing game as player 2"""
        assert game_id <= self.game_counter, "Invalid game ID"
        
        game = self.games[game_id].copy()
        
        # Validate game can be joined
        assert game.player1 != Account(), "Game does not exist"
        assert game.player2 == Account(), "Game is full"
        assert game.status == UInt64(0), "Game already started"
        
        # Add player 2 and update status
        game.player2 = Txn.sender
        game.status = UInt64(1)  # Ongoing
        
        # Update game in storage
        self.games[game_id] = game.copy()
        
        return String("Successfully joined game!")
    
    @abimethod()
    def submit_move(self, game_id: UInt64, move: UInt64) -> String:
        """Submit your move (1=Rock, 2=Paper, 3=Scissors)"""
        assert move >= 1 and move <= 3, "Invalid move (use 1=Rock, 2=Paper, 3=Scissors)"
        assert game_id <= self.game_counter, "Invalid game ID"
        
        game = self.games[game_id].copy()
        
        assert game.status == UInt64(1), "Game is not ongoing"
        
        # Determine which player is submitting
        if Txn.sender == game.player1:
            assert game.move1 == UInt64(0), "Player 1 already submitted move"
            game.move1 = move
        elif Txn.sender == game.player2:
            assert game.move2 == UInt64(0), "Player 2 already submitted move"
            game.move2 = move
        else:
            assert False, "You are not a player in this game"
        
        # Update game
        self.games[game_id] = game.copy()
        
        # Check if both moves are submitted
        if game.move1 != UInt64(0) and game.move2 != UInt64(0):
            return self._determine_winner(game_id)
        
        return String("Move submitted! Waiting for opponent...")
    
    @abimethod(readonly=True)
    def get_game(self, game_id: UInt64) -> Game:
        """Get game details by ID"""
        assert game_id <= self.game_counter, "Invalid game ID"
        return self.games[game_id].copy()
    
    @abimethod(readonly=True)
    def get_game_status(self, game_id: UInt64) -> String:
        """Get human-readable game status"""
        assert game_id <= self.game_counter, "Invalid game ID"
        game = self.games[game_id].copy()
        
        if game.status == UInt64(0):
            return String("Waiting for player 2")
        elif game.status == UInt64(1):
            return String("Game ongoing")
        else:
            if game.winner == Account():
                return String("Game finished - Draw!")
            else:
                return String("Game finished - Winner declared!")
    
    @abimethod()
    def _determine_winner(self, game_id: UInt64) -> String:
        """Internal method to determine the winner"""
        game = self.games[game_id].copy()
        
        # Check for draw
        if game.move1 == game.move2:
            game.winner = Account()
            game.status = UInt64(2)  # Finished
            self.games[game_id] = game.copy()
            return String("Game finished - It's a draw!")
        
        # Determine winner
        # Rock(1) beats Scissors(3)
        # Paper(2) beats Rock(1)
        # Scissors(3) beats Paper(2)
        player1_wins = (
            (game.move1 == UInt64(1) and game.move2 == UInt64(3)) or
            (game.move1 == UInt64(2) and game.move2 == UInt64(1)) or
            (game.move1 == UInt64(3) and game.move2 == UInt64(2))
        )
        
        if player1_wins:
            game.winner = game.player1
            result = String("Game finished - Player 1 wins!")
        else:
            game.winner = game.player2
            result = String("Game finished - Player 2 wins!")
        
        game.status = UInt64(2)  # Finished
        self.games[game_id] = game.copy()
        
        return result
    
    @abimethod(readonly=True)
    def get_winner(self, game_id: UInt64) -> Account:
        """Get the winner of a finished game"""
        assert game_id <= self.game_counter, "Invalid game ID"
        game = self.games[game_id].copy()
        assert game.status == UInt64(2), "Game not finished yet"
        return game.winner
    
    @abimethod()
    def transfer_ownership(self, new_owner: Account) -> String:
        """Transfer contract ownership"""
        assert Txn.sender == self.owner, "Only owner can transfer ownership"
        assert new_owner != Account(), "Invalid new owner address"
        
        self.owner = new_owner
        return String("Ownership transferred successfully!")
