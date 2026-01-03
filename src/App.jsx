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
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [showEliminationDialog, setShowEliminationDialog] = useState(false);
  const [pendingEliminations, setPendingEliminations] = useState([]);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'view'
    const [playerStats, setPlayerStats] = useState({});
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
const [resumeGameId, setResumeGameId] = useState(null);


const supabaseFetch = async (endpoint, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
};
  
  useEffect(() => {
  loadPlayerStats();
}, []);
  
useEffect(() => {
  const saved = localStorage.getItem('lastActiveGameId');
  if (saved) {
    setResumeGameId(saved);
  }
}, []);
  
  // Auto-refresh in view mode
  useEffect(() => {
  if (!gameName || gameOver|| viewMode !== 'view') return;

  const interval = setInterval(() => {
    loadActiveGame();
  }, 2000);

  return () => clearInterval(interval);
}, [gameName, gameOver, viewMode]);


  const loadPlayerStats = () => {
  const data = localStorage.getItem('playerStats');
  if (data) {
    setPlayerStats(JSON.parse(data));
  }
};
  
  const loadActiveGame = async () => {
  if (!gameName) return;

  try {
    const rows = await supabaseFetch(
      `games?game_name=eq.${encodeURIComponent(gameName)}&select=*`
    );

    if (!rows.length) return;

    const game = rows[0].data;

    setRoundScores(game.roundScores || []);
    setCurrentRound(game.currentRound || 1);
    setEliminatedPlayers(game.eliminatedPlayers || []);
    setGameOver(game.gameOver || false);
  } catch (err) {
    console.error('Live refresh failed', err);
  }
};
  
  const saveGame = async (gameData) => {
  await supabaseFetch(
  `games?on_conflict=game_name`,
  {
    method: 'POST',
    body: JSON.stringify({
      game_name: gameData.gameName,
      data: gameData,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!gameData.gameOver) {
    localStorage.setItem('lastActiveGameId', gameData.gameName);
    setResumeGameId(gameData.gameName);
  }
};

const loadExistingGame = async (gameName, mode = 'edit') => {
  setJoinError('');

  try {
    const rows = await supabaseFetch(
      `games?game_name=eq.${encodeURIComponent(gameName)}&select=*`
    );

    if (!rows || rows.length === 0) {
      if (mode === 'view') {
        setJoinError('❌ Game not found. Please check the name.');
      }
      return;
    }

    const game = rows[0].data; // 👈 THIS IS THE ACTUAL GAME

    setGameName(game.gameName);
    setMaxScore(game.maxScore);
    setPlayerNames(game.playerNames);
    setRoundScores(game.roundScores);
    setCurrentRound(game.currentRound);
    setGameOver(game.gameOver);
    setEliminatedPlayers(game.eliminatedPlayers || []);
    setViewMode(mode);

    setScreen('scoreboard');
  } catch (err) {
    console.error(err);
    setJoinError('❌ Unable to join game.');
  }
};
  
  const handleSetupNext = () => {
    if (setupStep === 1 && numPlayers >= 2 && numPlayers <= 6) {
      setPlayerNames(Array(parseInt(numPlayers)).fill(''));
      setSetupStep(2);
    } else if (setupStep === 2 && playerNames.every(name => name.trim())) {
      setSetupStep(3);
    } else if (setupStep === 3 && gameName.trim()) {
      setSetupStep(4);
    } else if (setupStep === 4 && maxScore > 0) {
      startGame();
    }
  };

  const startGame = () => {
    const initialRoundScores = {};
    playerNames.forEach(name => {
      initialRoundScores[name] = 0;
    });
    setCurrentRoundInput(initialRoundScores);
    setRoundScores([]);
    setCurrentRound(1);
    setGameOver(false);
    setEliminatedPlayers([]);
    setViewMode('edit');

    setScreen('scoreboard');
    // ✅ PASTE THIS PART HERE (VERY IMPORTANT)
saveGame({
  gameName, // 👈 this is the ID now
  maxScore,
  playerNames,
  roundScores: [],
  currentRound: 1,
  gameOver: false,
  eliminatedPlayers: []
});
};

  const calculateTotalScore = (playerName) => {
    return roundScores.reduce((total, round) => total + (round[playerName] || 0), 0);
  };

  const playEliminationSound = () => {
    // Create a fun elimination sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Dramatic descending tone sequence
    const frequencies = [880, 660, 440, 330];
    const startTime = audioContext.currentTime;
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const time = startTime + (index * 0.15);
      gainNode.gain.setValueAtTime(0.3, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      
      oscillator.start(time);
      oscillator.stop(time + 0.15);
    });
    
    // Add a final "whoosh" sound
    setTimeout(() => {
      const whiteNoise = audioContext.createBufferSource();
      const bufferSize = audioContext.sampleRate * 0.3;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      whiteNoise.buffer = buffer;
      
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      whiteNoise.start();
      whiteNoise.stop(audioContext.currentTime + 0.3);
    }, 600);
  };

  const saveRound = async () => {
    const newRoundScores = [...roundScores, { ...currentRoundInput }];
    setRoundScores(newRoundScores);

    // Check which players exceeded max score
    const newEliminations = [];
    playerNames.forEach(name => {
      if (!eliminatedPlayers.includes(name)) {
        const total = newRoundScores.reduce((sum, round) => sum + (round[name] || 0), 0);
        if (total >= parseInt(maxScore)) {
          newEliminations.push(name);
        }
      }
    });

    if (newEliminations.length > 0) {
      playEliminationSound();
      setPendingEliminations(newEliminations);
      setShowEliminationDialog(true);
    }

    // Reset current round input
    const resetInput = {};
    playerNames.forEach(name => {
      resetInput[name] = 0;
    });
    setCurrentRoundInput(resetInput);
    setCurrentRound(currentRound + 1);

    // Save game state
    await saveGame({
      gameName,
      maxScore,
      playerNames,
      roundScores: newRoundScores,
      currentRound: currentRound + 1,
      gameOver: false,
      eliminatedPlayers: eliminatedPlayers
    });
  };

  const handleEndGame = async () => {
    setGameOver(true);
    localStorage.removeItem('lastActiveGameId');
    setShowEliminationDialog(false);
    // 🔹 Update player lifetime stats
let updatedStats = { ...playerStats };

// Find winner (lowest score)
let winner = playerNames.reduce((best, player) => {
  if (!best) return player;
  return calculateTotalScore(player) < calculateTotalScore(best)
    ? player
    : best;
}, null);

playerNames.forEach(player => {
  if (!updatedStats[player]) {
    updatedStats[player] = { games: 0, wins: 0 };
  }

  updatedStats[player].games += 1;

  if (player === winner) {
    updatedStats[player].wins += 1;
  }
});

// Save stats
setPlayerStats(updatedStats);
localStorage.setItem('playerStats', JSON.stringify(updatedStats));
    
    await saveGame({
      gameName,
      maxScore,
      playerNames,
      roundScores,
      currentRound,
      gameOver: true,
      eliminatedPlayers: [...eliminatedPlayers, ...pendingEliminations]
    });
  };

  const handleContinueGame = async () => {
    const newEliminatedPlayers = [...eliminatedPlayers, ...pendingEliminations];
    setEliminatedPlayers(newEliminatedPlayers);
    setShowEliminationDialog(false);

    // Check if all players are eliminated
    if (newEliminatedPlayers.length >= playerNames.length) {
      setGameOver(true);
    }

    await saveGame({
      gameName,
      maxScore,
      playerNames,
      roundScores,
      currentRound,
      gameOver: newEliminatedPlayers.length >= playerNames.length,
      eliminatedPlayers: newEliminatedPlayers
    });
  };

  const resetGame = () => {
    setRoundScores([]);
    setCurrentRound(1);
    setGameOver(false);
    setEliminatedPlayers([]);
    const resetInput = {};
    playerNames.forEach(name => {
      resetInput[name] = 0;
    });
    setCurrentRoundInput(resetInput);
  };

  const getActivePlayers = () => {
    return playerNames.filter(name => !eliminatedPlayers.includes(name));
  };

  // Home Screen
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Rummy Score Tracker</h1>
            <p className="text-gray-600">Never calculate totals manually again</p>
          </div>

<div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
  {/* Start New Game */}
  <button
    onClick={() => {
      setScreen('setup');
      setSetupStep(1);
      setNumPlayers('');
      setPlayerNames([]);
      setGameName('');
      setMaxScore('');
    }}
    className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
  >
    <PlayCircle className="w-6 h-6" />
    Start New Game
  </button>

  {/* Join Existing Game */}
  <button
    onClick={() => {
      setGameName('');
      setScreen('join');
    }}
    className="w-full mt-4 bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
  >
    🔍 Join Existing Game
  </button>
</div>

          {/* Resume Last Game */}
{resumeGameId && (
  <button
    onClick={() => loadExistingGame(resumeGameId, 'edit')}
    className="w-full mt-4 bg-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition-colors"
  >
    ▶️ Resume Last Game
  </button>
)}
          {Object.keys(playerStats).length > 0 && (
  <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
    <h2 className="text-xl font-semibold mb-4 text-gray-800">
      🏆 Player Progress
    </h2>

    <div className="space-y-2">
      {Object.entries(playerStats).map(([player, stats]) => (
        <div
          key={player}
          className="flex justify-between bg-gray-50 p-3 rounded-lg"
        >
          <span className="font-semibold">{player}</span>
          <span className="text-gray-700">
            Games: {stats.games} | Wins: {stats.wins}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
        </div>
      </div>
    );
  }

  // Setup Screen
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Game Setup</h2>
                <span className="text-sm text-gray-500">Step {setupStep} of 4</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${(setupStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {setupStep === 1 && (
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  How many players are playing?
                </label>
                <input
                  type="number"
                  min="2"
                  max="6"
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(e.target.value)}
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-green-600 focus:outline-none"
                  placeholder="2-6 players"
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500">Minimum 2, Maximum 6 players</p>
              </div>
            )}

            {setupStep === 2 && (
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Enter player names
                </label>
                <div className="space-y-3">
                  {playerNames.map((name, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={name}
                      onChange={(e) => {
                        const newNames = [...playerNames];
                        newNames[idx] = e.target.value;
                        setPlayerNames(newNames);
                      }}
                      className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-green-600 focus:outline-none"
                      placeholder={`Player ${idx + 1} name`}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Game Name
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full p-4 text-xl border-2 border-gray-300 rounded-xl focus:border-green-600 focus:outline-none"
                  placeholder="e.g., Friday Night Rummy"
                  autoFocus
                />
              </div>
            )}

            {setupStep === 4 && (
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Maximum Score Limit
                </label>
                <input
                  type="number"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-green-600 focus:outline-none"
                  placeholder="e.g., 101, 201, 501"
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500">Players will be eliminated when they reach this score</p>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {setupStep > 1 && (
                <button
                  onClick={() => setSetupStep(setupStep - 1)}
                  className="flex-1 py-4 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleSetupNext}
                disabled={
                  (setupStep === 1 && (numPlayers < 2 || numPlayers > 6)) ||
                  (setupStep === 2 && !playerNames.every(name => name.trim())) ||
                  (setupStep === 3 && !gameName.trim()) ||
                  (setupStep === 4 && maxScore <= 0)
                }
                className="flex-1 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {setupStep === 4 ? 'Start Game' : 'Next'}
              </button>
            </div>

            <button
              onClick={() => setScreen('home')}
              className="w-full mt-4 py-3 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join Game Screen
if (screen === 'join') {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            Join Game
          </h2>

          <label className="block text-lg font-semibold mb-3 text-gray-700">
            Enter Game Name
          </label>

          <input
            type="text"
            value={gameName}
            onChange={(e) => {
  setGameName(e.target.value);
  setJoinError('');
}}
  
            className="w-full p-4 text-xl border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none"
            placeholder="Exact game name"
            autoFocus
          />

                    {joinError && (
  <p className="text-red-600 mt-3 text-center font-semibold">
    {joinError}
  </p>
)}

          <button
  onClick={async () => {
    if (!gameName.trim()) return;
    setJoining(true);
    await loadExistingGame(gameName.trim(), 'view');
    setJoining(false);
  }}
  disabled={joining}
  className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-60"
>
  {joining ? 'Joining…' : '👀 View Live Scores'}
</button>
          <button
            onClick={() => setScreen('home')}
            className="w-full mt-4 py-3 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

  
  // Scoreboard Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-800">{gameName}</h1>
            <div className="flex gap-2">
              {viewMode === 'view' && (
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  View Only
                </div>
              )}
              <button
  onClick={() => {
    setScreen('home');
  }}
  className="px-4 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
>
  Exit
</button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="text-lg font-semibold">Round {currentRound}</span>
            <span className="text-sm">Max Score: {maxScore}</span>
            {eliminatedPlayers.length > 0 && (
              <span className="text-sm text-red-600">
                {eliminatedPlayers.length} eliminated
              </span>
            )}
          </div>
        </div>

        {/* Elimination Dialog */}
        {showEliminationDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Player(s) Eliminated!</h2>
                  <p className="text-gray-600 mb-3">
                    The following player(s) have crossed {maxScore} points:
                  </p>
                  <div className="bg-orange-50 p-3 rounded-lg mb-4">
                    {pendingEliminations.map(player => (
                      <div key={player} className="font-semibold text-orange-800 mb-1">
                        • {player} - {calculateTotalScore(player)} points
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-700 font-medium mb-4">
                    Would you like to end the game or continue with the remaining players?
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleEndGame}
                      className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                    >
                      End Game & Declare Winner
                    </button>
                    <button
                      onClick={handleContinueGame}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                    >
                      Continue with Remaining Players
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Dialog */}
        {gameOver && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg p-6 mb-4">
            <div className="flex items-start gap-3 mb-4">
              <Trophy className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-red-800 mb-2">Game Over!</h2>
                <p className="text-red-700 mb-4">Final Standings (Lowest Score Wins)</p>
                <div className="space-y-2 mb-4">
                  {playerNames.map((player, idx) => {
                    const isEliminated = eliminatedPlayers.includes(player);
                    return (
                      <div key={player} className={`flex items-center justify-between bg-white p-3 rounded-lg ${isEliminated ? 'opacity-60' : ''}`}>
                        <span className="font-semibold">
                          {idx === 0 && !isEliminated && '🏆 '}
                          {idx + 1}. {player}
                          {isEliminated && <span className="text-xs ml-2 text-red-600">(Eliminated)</span>}
                        </span>
                        <span className="text-xl font-bold text-gray-800">{calculateTotalScore(player)}</span>
                      </div>
                    );
                  })}
                </div>
                {viewMode === 'edit' && (
                  <div className="flex gap-3">
                    <button
                      onClick={resetGame}
                      className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Reset Game
                    </button>
                    <button
                      onClick={() => setScreen('home')}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                    >
                      New Game
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scoreboard */}
        <div className="print-scorecard bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="p-4 text-left font-semibold">Player</th>
                  <th className="p-4 text-center font-semibold">Round Score<br/><span className="text-xs font-normal">(Max: 80)</span></th>
                  <th className="p-4 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {playerNames.map((player, idx) => {
                  const total = calculateTotalScore(player);
                  const isEliminated = eliminatedPlayers.includes(player);
                  const exceedsMax = total >= parseInt(maxScore);
                  return (
                    <tr key={player} className={`border-b ${isEliminated ? 'bg-red-50' : exceedsMax ? 'bg-orange-50' : idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="p-4 font-semibold text-gray-800">
                        {player}
                        {isEliminated && <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Eliminated</span>}
                        {!isEliminated && exceedsMax && <AlertCircle className="inline w-4 h-4 ml-2 text-orange-600" />}
                      </td>
                      <td className="p-4">
                        {viewMode === 'edit' && !isEliminated && !gameOver ? (
                          <input
                            type="number"
                            min="0"
                            max="80"
                            value={currentRoundInput[player] || 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              if (value <= 80 && value >= 0) {
                                setCurrentRoundInput({
                                  ...currentRoundInput,
                                  [player]: value
                                });
                              }
                            }}
                            className="w-full p-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none"
                          />
                        ) : (
                          <div className="w-full p-3 text-xl text-center text-gray-500">
                            {isEliminated || gameOver ? '-' : (currentRoundInput[player] || 0)}
                          </div>
                        )}
                      </td>
                      <td className={`p-4 text-center text-2xl font-bold ${isEliminated ? 'text-red-600' : exceedsMax ? 'text-orange-600' : 'text-gray-800'}`}>
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {viewMode === 'edit' && !gameOver && getActivePlayers().length > 0 && (
            <div className="p-4 bg-gray-50">
              <button
                onClick={saveRound}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Round {currentRound}
              </button>
            </div>
          )}

          <div className="p-4 print:hidden">
  <button
    onClick={() => window.print()}
    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
  >
    🖨️ Save Scorecard
  </button>
</div>
        </div>

        {/* Round History */}
        {roundScores.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Round History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Round</th>
                    {playerNames.map(player => (
                      <th key={player} className="p-2 text-center">{player}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roundScores.map((round, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 font-semibold text-gray-600">{idx + 1}</td>
                      {playerNames.map(player => (
                        <td key={player} className="p-2 text-center text-gray-800">
                          {round[player] || 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
