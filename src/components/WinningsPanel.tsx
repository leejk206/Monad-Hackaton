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

  const canClaim = phase === Phase.Settlement && userWinnings > 0n && connected;

  const handleClaim = async () => {
    if (!signer) return;

    setLoading(true);
    try {
      const contract = getContract(signer);
      const tx = await claimWinnings(contract, roundId);
      await tx.wait();
      alert("수익금을 받았습니다!");
      onClaimed();
    } catch (error: any) {
      console.error("Claim error:", error);
      alert(`수익금 수령 실패: ${error.message}`);
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
      {canClaim && (
        <button
          onClick={handleClaim}
          disabled={loading}
          className="btn-claim"
        >
          {loading ? "처리 중..." : "수익금 받기"}
        </button>
      )}
    </div>
  );
}

