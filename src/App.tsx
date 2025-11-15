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

  if (error && !provider) {
    // 지갑이 연결되지 않은 경우는 에러 화면을 표시하지 않음
    return (
      <div className="app">
        <header className="app-header">
          <h1>🏇 Monad Blitz</h1>
          <WalletButton />
        </header>
        <main className="app-main">
          <div className="app-error" style={{ margin: "50px auto", maxWidth: "600px", padding: "30px" }}>
            <h2>지갑을 연결해주세요</h2>
            <p>게임을 시작하려면 MetaMask 지갑을 연결해야 합니다.</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && provider) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🏇 Monad Blitz</h1>
          <WalletButton />
        </header>
        <main className="app-main">
          <div className="app-error" style={{ margin: "50px auto", maxWidth: "600px", padding: "30px", textAlign: "center" }}>
            <h2>⚠️ 컨트랙트 연결 오류</h2>
            <p style={{ margin: "20px 0", fontSize: "16px", lineHeight: "1.6" }}>{error}</p>
            <div style={{ marginTop: "30px", padding: "20px", background: "#f5f5f5", borderRadius: "8px", textAlign: "left" }}>
              <h3 style={{ marginBottom: "10px" }}>컨트랙트 배포 후에도 오류가 발생하는 경우:</h3>
              <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                <li><strong>네트워크 확인:</strong> MetaMask에서 올바른 네트워크(Chain ID)를 선택했는지 확인하세요</li>
                <li><strong>주소 확인:</strong> <code>src/config.ts</code>의 <code>CONTRACT_ADDRESS</code>가 배포된 주소와 정확히 일치하는지 확인하세요</li>
                <li><strong>네트워크 설정:</strong> <code>MONAD_NETWORK.chainId</code>가 배포한 네트워크의 Chain ID와 일치하는지 확인하세요</li>
                <li><strong>컨트랙트 확인:</strong> Explorer에서 해당 주소에 컨트랙트가 실제로 배포되었는지 확인하세요</li>
                <li><strong>브라우저 콘솔:</strong> F12를 눌러 콘솔에서 더 자세한 오류 정보를 확인하세요</li>
              </ol>
              <div style={{ marginTop: "20px", padding: "15px", background: "#fff3cd", borderRadius: "8px" }}>
                <strong>💡 팁:</strong> 브라우저 개발자 도구(F12)의 Console 탭에서 네트워크 정보와 상세 오류를 확인할 수 있습니다.
              </div>
            </div>
            <button 
              onClick={updateGameState}
              style={{
                marginTop: "20px",
                padding: "12px 24px",
                fontSize: "16px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              다시 시도
            </button>
          </div>
        </main>
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
              roundInfo={gameState.roundInfo}
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

