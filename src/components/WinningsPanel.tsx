import React, { useState } from "react";
import { ethers } from "ethers";
import { Phase } from "../types";
import { getContract, claimWinnings } from "../utils/contract";
import { useWallet } from "../hooks/useWallet";

interface WinningsPanelProps {
  phase: Phase;
  roundId: bigint;
  userWinnings: bigint;
  userBets: any[];
  onClaimed: () => void;
}

export function WinningsPanel({
  phase,
  roundId,
  userWinnings,
  userBets,
  onClaimed,
}: WinningsPanelProps) {
  const { signer, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  // Settlement Phase 이상이고 수익금이 있으면 청구 가능
  const canClaim = phase >= Phase.Settlement && userWinnings > 0n && connected;

  const handleClaim = async () => {
    if (!signer) {
      alert("지갑을 연결해주세요.");
      return;
    }

    if (userWinnings === 0n) {
      alert("받을 수익금이 없습니다.");
      return;
    }

    if (phase < Phase.Settlement) {
      alert("아직 정산 단계가 아닙니다.");
      return;
    }

    setLoading(true);
    try {
      const contract = getContract(signer);
      const tx = await claimWinnings(contract, roundId);
      console.log("수익금 청구 트랜잭션 전송:", tx.hash);
      await tx.wait();
      alert("✅ 수익금을 받았습니다!");
      onClaimed();
    } catch (error: any) {
      console.error("Claim error:", error);
      const errorMessage = error.reason || error.message || "알 수 없는 오류";
      alert(`❌ 수익금 수령 실패: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const totalBetAmount = userBets.reduce(
    (sum, bet) => sum + bet.amount,
    0n
  );

  if (userBets.length === 0 && userWinnings === 0n) {
    return null;
  }

  return (
    <div className="winnings-panel">
      <h3>내 베팅 정보</h3>
      <div className="winnings-info">
        <div className="winnings-item">
          <span>총 베팅 금액:</span>
          <span>{ethers.formatEther(totalBetAmount)} MONAD</span>
        </div>
        {userWinnings > 0n && (
          <div className="winnings-item highlight">
            <span>수익금:</span>
            <span>{ethers.formatEther(userWinnings)} MONAD</span>
          </div>
        )}
      </div>
      
      {/* 수익금이 있으면 항상 버튼 표시 (조건에 따라 활성/비활성) */}
      {userWinnings > 0n && (
        <div style={{ marginTop: "16px" }}>
          {!connected && (
            <div style={{ 
              padding: "8px", 
              background: "#ffebee", 
              borderRadius: "4px",
              marginBottom: "8px",
              fontSize: "14px"
            }}>
              지갑을 연결하여 수익금을 받으세요.
            </div>
          )}
          {phase < Phase.Settlement && (
            <div style={{ 
              padding: "8px", 
              background: "#fff3e0", 
              borderRadius: "4px",
              marginBottom: "8px",
              fontSize: "14px"
            }}>
              아직 정산 단계가 아닙니다. (현재 Phase: {phase === Phase.Betting ? "Betting" : phase === Phase.Racing ? "Racing" : "Unknown"})
            </div>
          )}
          <button
            onClick={handleClaim}
            disabled={loading || !canClaim}
            className="btn-claim"
            style={{
              width: "100%",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "bold",
              background: canClaim ? "#4CAF50" : "#cccccc",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: canClaim ? "pointer" : "not-allowed",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "처리 중..." : canClaim ? "💰 수익금 받기" : "수익금 받기 (대기 중)"}
          </button>
        </div>
      )}
    </div>
  );
}

