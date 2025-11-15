import React, { useState } from "react";
import { WalletButton } from "./components/WalletButton";
import { GameTimer } from "./components/GameTimer";
import { RaceTrack } from "./components/RaceTrack";
import { BettingPanel } from "./components/BettingPanel";
import { WinningsPanel } from "./components/WinningsPanel";
import { useGameState } from "./hooks/useGameState";
import { useWallet } from "./hooks/useWallet";
import { getContract, updatePositions, settleRound, startNewRound } from "./utils/contract";
import { Phase } from "./types";
import "./App.css";

function App() {
  const { provider, address, signer } = useWallet();
  const { gameState, loading, error, updateGameState } = useGameState(
    provider,
    address
  );
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleManualUpdate = async () => {
    console.log("[수동 업데이트] 버튼 클릭됨");
    console.log("[수동 업데이트] signer:", signer);
    console.log("[수동 업데이트] currentPhase:", gameState.currentPhase);
    
    if (!signer) {
      console.error("[수동 업데이트] signer가 없습니다");
      alert("지갑을 연결해주세요.");
      return;
    }

    setIsUpdating(true);
    try {
      console.log("[수동 업데이트] 컨트랙트 가져오는 중...");
      const contract = getContract(signer);
      console.log("[수동 업데이트] 컨트랙트:", contract);
      
      if (gameState.currentPhase === Phase.Racing) {
        console.log("[수동 업데이트] updatePositions 호출 중...");
        const tx = await contract.updatePositions();
        console.log("[수동 업데이트] updatePositions 트랜잭션:", tx.hash);
        await tx.wait();
        console.log("[수동 업데이트] updatePositions 완료");
        alert("위치가 업데이트되었습니다!");
      } else if (gameState.currentPhase === Phase.Settlement) {
        console.log("[수동 업데이트] settleRound 호출 중...");
        const tx = await contract.settleRound();
        console.log("[수동 업데이트] settleRound 트랜잭션:", tx.hash);
        await tx.wait();
        console.log("[수동 업데이트] settleRound 완료");
        alert("라운드가 정산되었습니다!");
      } else if (gameState.currentPhase === Phase.Finished) {
        console.log("[수동 업데이트] startNewRound 호출 중...");
        const tx = await contract.startNewRound();
        console.log("[수동 업데이트] startNewRound 트랜잭션:", tx.hash);
        await tx.wait();
        console.log("[수동 업데이트] startNewRound 완료");
        alert("새 라운드가 시작되었습니다!");
      } else {
        console.log("[수동 업데이트] 현재 Phase는 업데이트할 수 없습니다:", gameState.currentPhase);
        alert(`현재 Phase (${gameState.currentPhase})에서는 업데이트할 수 없습니다.`);
      }
      
      updateGameState();
    } catch (err: any) {
      console.error("[수동 업데이트] 실패:", err);
      console.error("[수동 업데이트] 오류 상세:", {
        message: err.message,
        code: err.code,
        data: err.data
      });
      alert(`업데이트 실패: ${err.message || err.toString()}`);
    } finally {
      setIsUpdating(false);
    }
  };

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

          {/* 수동 업데이트 버튼 (디버깅용) */}
          {signer && (gameState.currentPhase === Phase.Racing || gameState.currentPhase === Phase.Settlement || gameState.currentPhase === Phase.Finished) && (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <label style={{ marginRight: "10px" }}>
                <input
                  type="checkbox"
                  checked={autoUpdateEnabled}
                  onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                />
                자동 업데이트
              </label>
              <button
                onClick={handleManualUpdate}
                disabled={isUpdating}
                style={{
                  marginLeft: "10px",
                  padding: "8px 16px",
                  background: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
              >
                {isUpdating ? "처리 중..." : "수동 업데이트"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

