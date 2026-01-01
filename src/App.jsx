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
  const [editingLastRound, setEditingLastRound] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [showEliminationDialog, setShowEliminationDialog] = useState(false);
  const [pendingEliminations, setPendingEliminations] = useState([]);
  const [viewMode, setViewMode] = useState('edit');
  const [activeGameId, setActiveGameId] = useState(null);

  const handleSetupNext = () => {
    if (setupStep === 1 && numPlayers >= 2 && numPlayers <= 6) {
      setPlayerNames(Array(parseInt(numPlayers)).fill(''));
      setSetupStep(2);
    } else if (setupStep === 2 && playerNames.every(n => n.trim())) {
      setSetupStep(3);
    } else if (setupStep === 3 && gameName.trim()) {
      setSetupStep(4);
    } else if (setupStep === 4 && maxScore > 0) {
      startGame();
    }
  };

  const startGame = () => {
    const input = {};
    playerNames.forEach(p => (input[p] = 0));
    setCurrentRoundInput(input);
    setRoundScores([]);
    setCurrentRound(1);
    setEditingLastRound(false);
    setGameOver(false);
    setEliminatedPlayers([]);
    setViewMode('edit');
    setActiveGameId(Date.now().toString());
    setScreen('scoreboard');
  };

  const calculateTotalScore = (player) =>
    roundScores.reduce((sum, r) => sum + (r[player] || 0), 0);

  const saveRound = () => {
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
  };

  const resetGame = () => {
    setRoundScores([]);
    setCurrentRound(1);
    setEditingLastRound(false);
    setGameOver(false);
  };

  /* ===================== HOME ===================== */
  if (screen === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <button
          onClick={() => {
            setScreen('setup');
            setSetupStep(1);
            setNumPlayers('');
            setPlayerNames([]);
            setGameName('');
            setMaxScore('');
          }}
          className="bg-green-600 text-white px-6 py-4 rounded-xl font-semibold"
        >
          <PlayCircle className="inline mr-2" />
          Start New Game
        </button>
      </div>
    );
  }

  /* ===================== SETUP ===================== */
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow">
          {setupStep === 1 && (
            <input
              type="number"
              min="2"
              max="6"
              value={numPlayers}
              onChange={e => setNumPlayers(e.target.value)}
              placeholder="Number of players"
              className="w-full p-3 border rounded"
            />
          )}

          {setupStep === 2 &&
            playerNames.map((name, i) => (
              <input
                key={i}
                value={name}
                onChange={e => {
                  const copy = [...playerNames];
                  copy[i] = e.target.value;
                  setPlayerNames(copy);
                }}
                placeholder={`Player ${i + 1}`}
                className="w-full p-3 border rounded mt-2"
              />
            ))}

          {setupStep === 3 && (
            <input
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              placeholder="Game Name"
              className="w-full p-3 border rounded"
            />
          )}

          {setupStep === 4 && (
            <input
              type="number"
              value={maxScore}
              onChange={e => setMaxScore(e.target.value)}
              placeholder="Max Score"
              className="w-full p-3 border rounded"
            />
          )}

          <button
            onClick={handleSetupNext}
            className="mt-4 w-full bg-green-600 text-white py-3 rounded"
          >
            {setupStep === 4 ? 'Start Game' : 'Next'}
          </button>
        </div>
      </div>
    );
  }

  /* ===================== SCOREBOARD ===================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-2xl font-bold mb-4">{gameName}</h1>

        {/* Edit Last Round */}
        {roundScores.length > 0 && !editingLastRound && !gameOver && (
          <button
            onClick={() => {
              setEditingLastRound(true);
              setCurrentRoundInput({ ...roundScores[roundScores.length - 1] });
            }}
            className="mb-3 w-full py-3 bg-yellow-500 text-white rounded-xl font-semibold"
          >
            Edit Last Round
          </button>
        )}

        <table className="w-full bg-white rounded shadow">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-center">Round Score</th>
              <th className="p-3 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {playerNames.map((player, idx) => (
              <tr key={player} className={idx % 2 ? 'bg-gray-50' : ''}>
                <td className="p-3 font-semibold">{player}</td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    max="80"
                    value={currentRoundInput[player] || 0}
                    onChange={e =>
                      setCurrentRoundInput({
                        ...currentRoundInput,
                        [player]: Math.min(80, Number(e.target.value))
                      })
                    }
                    className="w-20 text-center border rounded"
                  />
                </td>
                <td className="p-3 text-center font-bold">
                  {calculateTotalScore(player)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={saveRound}
          className="mt-4 w-full bg-green-600 text-white py-3 rounded-xl font-semibold"
        >
          <Save className="inline mr-2" />
          {editingLastRound ? 'Save Changes' : `Save Round ${currentRound}`}
        </button>

        {gameOver && (
          <button
            onClick={resetGame}
            className="mt-3 w-full bg-gray-600 text-white py-3 rounded-xl"
          >
            <RotateCcw className="inline mr-2" />
            Reset Game
          </button>
        )}
      </div>
    </div>
  );
}
