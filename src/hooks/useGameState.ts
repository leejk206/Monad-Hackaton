import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getContract, getCurrentRound, getPositions, getTotalBets, getUserBets, getUserWinnings } from "../utils/contract";
import { ROUND_DURATION, BETTING_PHASE_END, RACING_PHASE_START, RACING_PHASE_END } from "../config";
import { Phase, GameState } from "../types";

export function useGameState(provider: ethers.BrowserProvider | null, address: string | null) {
  const [gameState, setGameState] = useState<GameState>({
    roundInfo: null,
    positions: [0, 0, 0, 0],
    totalBets: [0n, 0n, 0n, 0n],
    userBets: [],
    userWinnings: 0n,
    timeRemaining: 0,
    currentPhase: Phase.Betting,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateGameState = useCallback(async () => {
    if (!provider) {
      setLoading(false);
      return;
    }

    try {
      const contract = getContract(provider);
      const roundInfo = await getCurrentRound(contract);
      const positions = await getPositions(contract);
      const totalBets = await getTotalBets(contract);

      // Calculate time remaining and phase
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - Number(roundInfo.startTime);
      const timeRemaining = Math.max(0, ROUND_DURATION - elapsed);

      let currentPhase = Phase.Betting;
      if (elapsed > BETTING_PHASE_END) {
        if (elapsed < RACING_PHASE_START) {
          currentPhase = Phase.Betting; // Transition period
        } else if (elapsed < RACING_PHASE_END) {
          currentPhase = Phase.Racing;
        } else if (elapsed < ROUND_DURATION) {
          currentPhase = Phase.Settlement;
        } else {
          currentPhase = Phase.Finished;
        }
      }

      // Get user-specific data
      let userBets: any[] = [];
      let userWinnings = 0n;
      if (address) {
        userBets = await getUserBets(contract, roundInfo.roundId, address);
        userWinnings = await getUserWinnings(contract, roundInfo.roundId, address);
      }

      setGameState({
        roundInfo,
        positions,
        totalBets,
        userBets,
        userWinnings,
        timeRemaining,
        currentPhase,
      });

      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch game state");
      console.error("Error updating game state:", err);
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => {
    updateGameState();

    // Update every second
    const interval = setInterval(updateGameState, 1000);

    // Update positions more frequently during racing phase
    const racingInterval = setInterval(() => {
      if (gameState.currentPhase === Phase.Racing) {
        updateGameState();
      }
    }, 500);

    return () => {
      clearInterval(interval);
      clearInterval(racingInterval);
    };
  }, [updateGameState, gameState.currentPhase]);

  return { gameState, loading, error, updateGameState };
}

