import React from "react";
import { WalletButton } from "./components/WalletButton";
import { GameTimer } from "./components/GameTimer";
import { RaceTrack } from "./components/RaceTrack";
import { BettingPanel } from "./components/BettingPanel";
import { WinningsPanel } from "./components/WinningsPanel";
import { useGameState } from "./hooks/useGameState";
import { useWallet } from "./hooks/useWallet";
import "./App.css";

function App() {
  const { provider, address } = useWallet();
  const { gameState, loading, error, updateGameState } = useGameState(
    provider,
    address
  );

  if (loading && !gameState.roundInfo) {
    return (
      <div className="app-loading">
        <div>게임 상태를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <div>오류 발생: {error}</div>
        <button onClick={updateGameState}>다시 시도</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏇 Monad Blitz</h1>
        <WalletButton />
      </header>

      <main className="app-main">
        <div className="game-container">
          <GameTimer
            timeRemaining={gameState.timeRemaining}
            phase={gameState.currentPhase}
          />

          <RaceTrack
            positions={gameState.positions}
            winner={
              gameState.currentPhase >= 2 && gameState.roundInfo
                ? gameState.roundInfo.winner
                : undefined
            }
          />

          <div className="game-panels">
            <BettingPanel
              phase={gameState.currentPhase}
              totalBets={gameState.totalBets}
              userBets={gameState.userBets}
              onBetPlaced={updateGameState}
            />

            {gameState.roundInfo && (
              <WinningsPanel
                phase={gameState.currentPhase}
                roundId={gameState.roundInfo.roundId}
                userWinnings={gameState.userWinnings}
                userBets={gameState.userBets}
                onClaimed={updateGameState}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

