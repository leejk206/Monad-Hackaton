import React, { useState } from "react";
import { ethers } from "ethers";
import { HORSES, MIN_BET_AMOUNT, MAX_BET_AMOUNT } from "../config";
import { Phase } from "../types";
import { getContract, placeBet } from "../utils/contract";
import { useWallet } from "../hooks/useWallet";

interface BettingPanelProps {
  phase: Phase;
  totalBets: bigint[];
  userBets: any[];
  onBetPlaced: () => void;
}

export function BettingPanel({
  phase,
  totalBets,
  userBets,
  onBetPlaced,
}: BettingPanelProps) {
  const { signer, address, connected } = useWallet();
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const canBet = phase === Phase.Betting && connected;

  const handleBet = async () => {
    if (!signer || !selectedHorse || !betAmount) return;

    const amount = parseFloat(betAmount);
    if (amount < MIN_BET_AMOUNT || amount > MAX_BET_AMOUNT) {
      alert(`베팅 금액은 ${MIN_BET_AMOUNT} ~ ${MAX_BET_AMOUNT} MONAD 사이여야 합니다.`);
      return;
    }

    setLoading(true);
    try {
      const contract = getContract(signer);
      const tx = await placeBet(contract, selectedHorse, betAmount);
      await tx.wait();
      alert("베팅이 완료되었습니다!");
      setBetAmount("");
      onBetPlaced();
    } catch (error: any) {
      console.error("Betting error:", error);
      alert(`베팅 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: bigint) => {
    return ethers.formatEther(balance);
  };

  return (
    <div className="betting-panel">
      <h3>베팅하기</h3>
      {!connected && (
        <div className="betting-warning">
          지갑을 연결하여 베팅하세요.
        </div>
      )}
      {phase !== Phase.Betting && (
        <div className="betting-warning">
          현재 베팅 단계가 아닙니다.
        </div>
      )}

      <div className="horse-selection">
        {HORSES.map((horse) => {
          const totalBet = totalBets[horse.id] || 0n;
          const userBetOnHorse = userBets
            .filter((bet) => bet.horseId === horse.id)
            .reduce((sum, bet) => sum + bet.amount, 0n);

          return (
            <div
              key={horse.id}
              className={`horse-option ${
                selectedHorse === horse.id ? "selected" : ""
              }`}
              onClick={() => canBet && setSelectedHorse(horse.id)}
              style={{
                borderColor: horse.color,
                opacity: canBet ? 1 : 0.6,
              }}
            >
              <div className="horse-option-header">
                <span style={{ color: horse.color }}>{horse.symbol}</span>
                <span>{horse.name}</span>
              </div>
              <div className="horse-option-stats">
                <div>총 베팅: {formatBalance(totalBet)} MONAD</div>
                {userBetOnHorse > 0n && (
                  <div>내 베팅: {formatBalance(userBetOnHorse)} MONAD</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedHorse !== null && canBet && (
        <div className="bet-input">
          <label>
            베팅 금액 (MONAD)
            <input
              type="number"
              min={MIN_BET_AMOUNT}
              max={MAX_BET_AMOUNT}
              step="0.001"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder={`${MIN_BET_AMOUNT} ~ ${MAX_BET_AMOUNT}`}
            />
          </label>
          <button
            onClick={handleBet}
            disabled={loading || !betAmount}
            className="btn-bet"
          >
            {loading ? "처리 중..." : "베팅하기"}
          </button>
        </div>
      )}
    </div>
  );
}

