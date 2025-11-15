import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getContract, getCurrentRound, getPositions, getTotalBets, getUserBets, getUserWinnings, checkContractExists, isContractAddressValid } from "../utils/contract";
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

    // 컨트랙트 주소 유효성 확인
    if (!isContractAddressValid()) {
      setError("컨트랙트가 배포되지 않았습니다. src/config.ts에서 CONTRACT_ADDRESS를 설정해주세요.");
      setLoading(false);
      return;
    }

    // 네트워크가 안정화될 때까지 잠시 대기
    try {
      await provider.getNetwork();
    } catch (err: any) {
      // 네트워크 변경 중이면 잠시 후 재시도
      if (err.code === "NETWORK_ERROR") {
        console.log("네트워크 변경 중... 잠시 후 다시 시도합니다.");
        setTimeout(updateGameState, 2000);
        return;
      }
      throw err;
    }

    // 컨트랙트 존재 여부 확인 (재시도 로직 포함)
    const contractExists = await checkContractExists(provider);
    if (!contractExists) {
      // 네트워크 정보 확인
      try {
        const network = await provider.getNetwork();
        const currentChainId = Number(network.chainId);
        const { CONTRACT_ADDRESS } = await import("../config");
        const { MONAD_NETWORK } = await import("../config");
        
        setError(
          `컨트랙트를 찾을 수 없습니다.\n\n` +
          `현재 네트워크: Chain ID ${currentChainId} (0x${currentChainId.toString(16)})\n` +
          `설정된 네트워크: Chain ID ${MONAD_NETWORK.chainId} (0x${MONAD_NETWORK.chainId.toString(16)})\n` +
          `컨트랙트 주소: ${CONTRACT_ADDRESS}\n\n` +
          `가능한 원인:\n` +
          `1. 컨트랙트가 다른 네트워크에 배포되었을 수 있습니다.\n` +
          `2. 컨트랙트 주소가 잘못되었을 수 있습니다.\n` +
          `3. MetaMask에서 올바른 네트워크를 선택했는지 확인해주세요.`
        );
      } catch (networkError) {
        setError("컨트랙트를 찾을 수 없습니다. 네트워크 정보를 확인할 수 없습니다.");
      }
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
      // elapsed가 ROUND_DURATION을 넘어가면 0으로 설정 (새 라운드 대기)
      const timeRemaining = elapsed >= ROUND_DURATION ? 0 : Math.max(0, ROUND_DURATION - elapsed);

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

      // 게임 상태 업데이트는 로컬 서버에서 처리합니다

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
      // NETWORK_ERROR는 네트워크 변경 중 발생할 수 있으므로 재시도
      if (err.code === "NETWORK_ERROR") {
        console.log("네트워크 변경 중... 잠시 후 다시 시도합니다.");
        setTimeout(() => updateGameState(), 2000);
        return;
      }
      
      // BAD_DATA 오류는 컨트랙트가 없거나 주소가 잘못된 경우
      if (err.code === "BAD_DATA" || err.message?.includes("could not decode")) {
        try {
          const networkInfo = await provider.getNetwork();
          const currentChainId = Number(networkInfo.chainId);
          const { CONTRACT_ADDRESS } = await import("../config");
          const { MONAD_NETWORK } = await import("../config");
          
          setError(
            `컨트랙트 호출 실패 (BAD_DATA)\n\n` +
            `현재 네트워크: Chain ID ${currentChainId}\n` +
            `설정된 네트워크: Chain ID ${MONAD_NETWORK.chainId}\n` +
            `컨트랙트 주소: ${CONTRACT_ADDRESS}\n\n` +
            `가능한 원인:\n` +
            `1. 네트워크가 일치하지 않습니다. (현재: ${currentChainId}, 설정: ${MONAD_NETWORK.chainId})\n` +
            `2. 컨트랙트 ABI가 맞지 않습니다.\n` +
            `3. 컨트랙트 주소가 잘못되었습니다.\n` +
            `4. 컨트랙트가 해당 네트워크에 배포되지 않았습니다.`
          );
        } catch (networkError) {
          const { CONTRACT_ADDRESS: CONTRACT_ADDR } = await import("../config");
          setError(
            `컨트랙트 호출 실패 (BAD_DATA)\n\n` +
            `컨트랙트 주소: ${CONTRACT_ADDR}\n\n` +
            `가능한 원인:\n` +
            `1. 네트워크가 일치하지 않습니다.\n` +
            `2. 컨트랙트 ABI가 맞지 않습니다.\n` +
            `3. 컨트랙트 주소가 잘못되었습니다.`
          );
        }
      } else {
        setError(err.message || "게임 상태를 불러오는데 실패했습니다.");
      }
      console.error("Error updating game state:", err);
      console.error("Error details:", {
        code: err.code,
        message: err.message,
        data: err.data,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => {
    updateGameState();

    // Update every second
    const interval = setInterval(updateGameState, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [updateGameState]);

  return { gameState, loading, error, updateGameState };
}

