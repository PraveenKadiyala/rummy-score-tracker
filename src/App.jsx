import React, { useState, useEffect } from 'react';
import { AlertCircle, Save, Trophy, RotateCcw, PlayCircle, Eye, Edit } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [setupStep, setSetupStep] = useState(1);
  const [numPlayers, setNumPlayers] = useState('');
  const [playerNames, setPlayerNames] = useState([]);
  const [gameName, setGameName] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [roundScores, setRoundScores] = useState([]);
  const [currentRoundInput, setCurrentRoundInput] = useState({});
  const [gameOver, setGameOver] = useState(false);
  const [games, setGames] = useState([]);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [showEliminationDialog, setShowEliminationDialog] = useState(false);
  const [pendingEliminations, setPendingEliminations] = useState([]);
  const [viewMode, setViewMode] = useState('edit');
  const [activeGameId, setActiveGameId] = useState(null);

  // 🔹 NEW: edit last round only
  const [editingLastRound, setEditingLastRound] = useState(false);

  // 🔹 NEW: resume last game automatically
  useEffect(() => {
    const lastGameId = localStorage.getItem('lastGameId');
    if (lastGameId) {
      loadExistingGame(lastGameId, 'edit');
    } else {
      loadGames();
    }
  }, []);

  // Auto-refresh in view mode
  useEffect(() => {
    if (viewMode === 'view' && activeGameId) {
      const interval = setInterval(loadActiveGame, 2000);
      return () => clearInterval(interval);
    }
  }, [viewMode, activeGameId]);

  const loadGames = async () => {
    try {
      const stored = await window.storage.list('game:', true);
      if (stored?.keys) {
        const gamePromises = stored.keys.map(async (key) => {
          const result = await window.storage.get(key, true);
          return result ? JSON.parse(result.value) : null;
        });
        const loadedGames = (await Promise.all(gamePromises)).filter(Boolean);
        setGames(loadedGames.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch {}
  };

  const loadActiveGame = async () => {
    if (!activeGameId) return;
    const result = await window.storage.get(`game:${activeGameId}`, true);
    if (result) {
      const game = JSON.parse(result.value);
      setRoundScores(game.roundScores);
      setCurrentRound(game.currentRound);
      setEliminatedPlayers(game.eliminatedPlayers || []);
      setGameOver(game.gameOver);
    }
  };

  const saveGame = async (gameData) => {
    await window.storage.set(
      `game:${gameData.id}`,
      JSON.stringify({ ...gameData, timestamp: Date.now() }),
      true
    );
    localStorage.setItem('lastGameId', gameData.id);
    await loadGames();
  };

  const loadExistingGame = async (gameId, mode = 'edit') => {
    const result = await window.storage.get(`game:${gameId}`, true);
    if (result) {
      const game = JSON.parse(result.value);
      setGameName(game.gameName);
      setMaxScore(game.maxScore);
      setPlayerNames(game.playerNames);
      setRoundScores(game.roundScores);
      setCurrentRound(game.currentRound);
      setGameOver(game.gameOver);
      setEliminatedPlayers(game.eliminatedPlayers || []);
      setViewMode(mode);
      setActiveGameId(gameId);
      setScreen('scoreboard');
    }
  };

  const startGame = () => {
    const input = {};
    playerNames.forEach(p => (input[p] = 0));
    const id = `${gameName.replace(/\s+/g, '_')}_${Date.now()}`;
    setCurrentRoundInput(input);
    setRoundScores([]);
    setCurrentRound(1);
    setGameOver(false);
    setEliminatedPlayers([]);
    setEditingLastRound(false);
    setActiveGameId(id);
    localStorage.setItem('lastGameId', id);
    setScreen('scoreboard');
  };

  const calculateTotalScore = (player) =>
    roundScores.reduce((sum, r) => sum + (r[player] || 0), 0);

  // 🔹 EDIT LAST ROUND LOGIC
  const saveRound = async () => {
    let updatedRounds = [...roundScores];

    if (editingLastRound) {
      updatedRounds[updatedRounds.length - 1] = { ...currentRoundInput };
      setEditingLastRound(false);
    } else {
      updatedRounds.push({ ...currentRoundInput });
      setCurrentRound(currentRound + 1);
    }

    setRoundScores(updatedRounds);

    const reset = {};
    playerNames.forEach(p => (reset[p] = 0));
    setCurrentRoundInput(reset);

    await saveGame({
      id: activeGameId,
      gameName,
      maxScore,
      playerNames,
      roundScores: updatedRounds,
      currentRound: editingLastRound ? currentRound : currentRound + 1,
      gameOver,
      eliminatedPlayers
    });
  };

  const resetGame = () => {
    setRoundScores([]);
    setCurrentRound(1);
    setGameOver(false);
    setEditingLastRound(false);
  };

  /* ========================= UI BELOW (UNCHANGED) ========================= */

  if (screen === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => {
            setScreen('setup');
            setSetupStep(1);
            setNumPlayers('');
            setPlayerNames([]);
            setGameName('');
            setMaxScore('');
          }}
          className="bg-green-600 text-white px-6 py-4 rounded-xl"
        >
          <PlayCircle className="inline mr-2" /> Start New Game
        </button>
      </div>
    );
  }

  if (screen === 'setup') {
    if (setupStep === 4) startGame();
    return null;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{gameName}</h1>

      {roundScores.length > 0 && !editingLastRound && (
        <button
          onClick={() => {
            setEditingLastRound(true);
            setCurrentRoundInput({ ...roundScores[roundScores.length - 1] });
          }}
          className="mb-3 bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Edit Last Round
        </button>
      )}

      <table className="w-full border">
        <tbody>
          {playerNames.map(player => (
            <tr key={player}>
              <td>{player}</td>
              <td>
                <input
                  type="number"
                  max="80"
                  value={currentRoundInput[player] || 0}
                  onChange={(e) =>
                    setCurrentRoundInput({
                      ...currentRoundInput,
                      [player]: Math.min(80, Number(e.target.value))
                    })
                  }
                />
              </td>
              <td>{calculateTotalScore(player)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={saveRound}
        className="mt-4 bg-green-600 text-white px-6 py-3 rounded"
      >
        <Save className="inline mr-2" />
        {editingLastRound ? 'Save Changes' : 'Save Round'}
      </button>

      {gameOver && (
        <button onClick={resetGame} className="mt-4 bg-gray-500 text-white px-4 py-2 rounded">
          <RotateCcw className="inline mr-2" /> Reset Game
        </button>
      )}
    </div>
  );
}
