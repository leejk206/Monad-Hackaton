import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WalletButton } from "./components/WalletButton";
import { GameTimer } from "./components/GameTimer";
import { RaceTrack } from "./components/RaceTrack";
import { BettingPanel } from "./components/BettingPanel";
import { WinningsPanel } from "./components/WinningsPanel";
import { useGameState } from "./hooks/useGameState";
import { useWallet } from "./hooks/useWallet";
import { getContract, claimWinnings } from "./utils/contract";
import { TradingViewChart } from "./components/TradingViewChart"; // 🔹 차트 컴포넌트 import
import "./App.css";

// TradingView에서 사용할 코인 심볼 목록
const COINS = [
  { label: "BTC", symbol: "BINANCE:BTCUSDT" },
  { label: "ETH", symbol: "BINANCE:ETHUSDT" },
  { label: "LINK", symbol: "BINANCE:LINKUSDT" },
  { label: "DOGE", symbol: "BINANCE:DOGEUSDT" },
];

function App() {
  const { provider, address, signer, connected } = useWallet();
  const { gameState, loading, error, updateGameState } = useGameState(
    provider,
    address
  );
  const [claiming, setClaiming] = useState(false);
  const [claimableRounds, setClaimableRounds] = useState<
    Array<{ roundId: bigint; amount: bigint }>
  >([]);
  const [totalClaimable, setTotalClaimable] = useState(0n);

  // 차트에서 선택된 코인 상태
  const [selectedCoin, setSelectedCoin] = useState(COINS[0]);

  // 모든 라운드의 상금 확인
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    async function checkAllWinnings() {
      if (!provider || !address || !gameState.roundInfo || !isMounted) return;

      try {
        const contract = getContract(provider);
        const currentRoundId = gameState.roundInfo.roundId;
        const roundsToCheck: bigint[] = [];

        // 현재 라운드와 이전 라운드들 확인 (최대 10개 라운드)
        for (let i = 0; i <= 10 && currentRoundId >= BigInt(i); i++) {
          const roundId = currentRoundId - BigInt(i);
          if (roundId >= 0n) {
            roundsToCheck.push(roundId);
          }
        }

        const claimable: Array<{ roundId: bigint; amount: bigint }> = [];
        let total = 0n;

        for (const roundId of roundsToCheck) {
          try {
            const winnings = await contract.getUserWinnings(roundId, address);
            if (winnings > 0n && isMounted) {
              claimable.push({ roundId, amount: winnings });
              total += winnings;
            }
          } catch (err) {
            // 라운드가 없거나 오류가 발생하면 무시
            continue;
          }
        }

        if (isMounted) {
          setClaimableRounds(claimable);
          setTotalClaimable(total);
        }
      } catch (err) {
        console.error("상금 확인 실패:", err);
      }
    }

    if (connected && address && gameState.roundInfo) {
      checkAllWinnings();
      // 5초마다 업데이트
      intervalId = setInterval(checkAllWinnings, 5000);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [provider, address, connected, gameState.roundInfo?.roundId]);

  const handleClaimAll = async () => {
    if (!signer || claimableRounds.length === 0 || claiming) return;

    setClaiming(true);
    try {
      const contract = getContract(signer);
      let successCount = 0;
      const failedRounds: Array<{ roundId: bigint; reason: string }> = [];
      const alreadyClaimedRounds: bigint[] = [];

      for (const { roundId } of claimableRounds) {
        // 이미 청구한 라운드는 건너뛰기
        if (alreadyClaimedRounds.includes(roundId)) continue;

        try {
          const tx = await claimWinnings(contract, roundId);
          console.log(`라운드 ${roundId} 상금 청구 트랜잭션:`, tx.hash);
          await tx.wait();
          successCount++;
          alreadyClaimedRounds.push(roundId);
        } catch (error: any) {
          const errorMsg = error.message || error.reason || "알 수 없는 오류";
          console.error(`라운드 ${roundId} 상금 청구 실패:`, errorMsg);

          // 오류 원인 분류
          let reason = "";
          if (errorMsg.includes("Round not settled")) {
            reason = "아직 정산되지 않음";
          } else if (errorMsg.includes("No winning bets")) {
            reason =
              "승리한 베팅이 없음 (이미 청구했거나 승리하지 않음)";
          } else {
            reason = errorMsg;
          }

          failedRounds.push({ roundId, reason });
        }
      }

      // 결과 메시지 표시
      if (successCount > 0) {
        let message = `✅ ${successCount}개 라운드의 상금을 받았습니다!`;
        if (failedRounds.length > 0) {
          message += `\n\n⚠️ ${failedRounds.length}개 라운드는 청구하지 못했습니다:`;
          failedRounds.forEach(({ roundId, reason }) => {
            message += `\n  - 라운드 ${roundId}: ${reason}`;
          });
        }
        alert(message);
        // 상금 청구 후 상태 업데이트 (약간의 지연 후)
        setTimeout(() => {
          updateGameState();
        }, 2000);
      } else if (failedRounds.length > 0) {
        // 모든 라운드가 실패한 경우
        let message = `❌ 상금 청구 실패:\n\n`;
        failedRounds.forEach(({ roundId, reason }) => {
          message += `라운드 ${roundId}: ${reason}\n`;
        });
        message += `\n💡 정산이 완료된 라운드만 상금을 받을 수 있습니다.`;
        alert(message);
      }
    } catch (error: any) {
      console.error("상금 청구 오류:", error);
      alert(
        `❌ 상금 청구 실패: ${
          error.message || error.reason || "알 수 없는 오류"
        }`
      );
    } finally {
      setClaiming(false);
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
          <div
            className="app-error"
            style={{
              margin: "50px auto",
              maxWidth: "600px",
              padding: "30px",
            }}
          >
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
          <div
            className="app-error"
            style={{
              margin: "50px auto",
              maxWidth: "600px",
              padding: "30px",
              textAlign: "center",
            }}
          >
            <h2>⚠️ 컨트랙트 연결 오류</h2>
            <p
              style={{
                margin: "20px 0",
                fontSize: "16px",
                lineHeight: "1.6",
              }}
            >
              {error}
            </p>
            <div
              style={{
                marginTop: "30px",
                padding: "20px",
                background: "#f5f5f5",
                borderRadius: "8px",
                textAlign: "left",
              }}
            >
              <h3 style={{ marginBottom: "10px" }}>
                컨트랙트 배포 후에도 오류가 발생하는 경우:
              </h3>
              <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                <li>
                  <strong>네트워크 확인:</strong> MetaMask에서 올바른
                  네트워크(Chain ID)를 선택했는지 확인하세요
                </li>
                <li>
                  <strong>주소 확인:</strong> <code>src/config.ts</code>의{" "}
                  <code>CONTRACT_ADDRESS</code>가 배포된 주소와 정확히
                  일치하는지 확인하세요
                </li>
                <li>
                  <strong>네트워크 설정:</strong>{" "}
                  <code>MONAD_NETWORK.chainId</code>가 배포한 네트워크의
                  Chain ID와 일치하는지 확인하세요
                </li>
                <li>
                  <strong>컨트랙트 확인:</strong> Explorer에서 해당 주소에
                  컨트랙트가 실제로 배포되었는지 확인하세요
                </li>
                <li>
                  <strong>브라우저 콘솔:</strong> F12를 눌러 콘솔에서 더
                  자세한 오류 정보를 확인하세요
                </li>
              </ol>
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#fff3cd",
                  borderRadius: "8px",
                }}
              >
                <strong>💡 팁:</strong> 브라우저 개발자 도구(F12)의 Console 탭에서
                네트워크 정보와 상세 오류를 확인할 수 있습니다.
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
                cursor: "pointer",
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

      {/* 최상단 상금 인출 버튼 */}
      {connected && totalClaimable > 0n && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "16px 20px",
            marginBottom: "20px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            borderRadius: "0 0 12px 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              maxWidth: "1200px",
              margin: "0 auto",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ color: "white" }}>
              <div
                style={{
                  fontSize: "14px",
                  opacity: 0.9,
                  marginBottom: "4px",
                }}
              >
                받을 수 있는 상금
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                💰 {ethers.formatEther(totalClaimable)} MONAD
              </div>
              {claimableRounds.length > 1 && (
                <div
                  style={{
                    fontSize: "12px",
                    opacity: 0.8,
                    marginTop: "4px",
                  }}
                >
                  {claimableRounds.length}개 라운드
                </div>
              )}
            </div>
            <button
              onClick={handleClaimAll}
              disabled={claiming}
              style={{
                padding: "12px 32px",
                fontSize: "16px",
                fontWeight: "bold",
                background: claiming ? "#cccccc" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: claiming ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                transition: "all 0.3s",
                minWidth: "150px",
              }}
              onMouseOver={(e) => {
                if (!claiming) {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 8px rgba(0,0,0,0.3)";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 2px 4px rgba(0,0,0,0.2)";
              }}
            >
              {claiming ? "처리 중..." : "💰 상금 받기"}
            </button>
          </div>
        </div>
      )}

      <main className="app-main">
        {/* 왼쪽: 게임 / 오른쪽: 실제 차트 패널 */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "flex-start",
          }}
        >
          {/* 게임 영역 */}
          <div className="game-container" style={{ flex: 1 }}>
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

          {/* 차트 패널 */}
          <aside
            style={{
              flex: 1,
              minWidth: "380px",
              maxWidth: "520px",
              background: "#111827",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid #1f2937",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <h2 style={{ marginBottom: "8px", fontSize: "20px" }}>
              📈 Live Price Chart
            </h2>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "13px",
                color: "#9ca3af",
              }}
            >
              실제 시장 차트를 보면서 어느 말(BTC / ETH / LINK / DOGE)에
              베팅할지 결정해 보세요.
            </p>

            {/* 코인 탭 버튼 */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              {COINS.map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => setSelectedCoin(coin)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: "1px solid #374151",
                    background:
                      selectedCoin.symbol === coin.symbol
                        ? "#374151"
                        : "transparent",
                    color: "#e5e7eb",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {coin.label}
                </button>
              ))}
            </div>

            {/* TradingView 차트 */}
            <div style={{ height: "360px" }}>
              <TradingViewChart
                key={selectedCoin.symbol} // 심볼 바뀔 때마다 위젯 리마운트
                symbol={selectedCoin.symbol}
                interval="1" // 1분봉
                theme="dark"
                height={360}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
