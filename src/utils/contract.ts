import { ethers } from "ethers";
import { CONTRACT_ADDRESS } from "../config";
import MonadBlitzABI from "../abis/MonadBlitz.json";

export function isContractAddressValid(): boolean {
  return CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" &&
         ethers.isAddress(CONTRACT_ADDRESS);
}

export async function checkContractExists(provider: ethers.Provider, retries = 3): Promise<boolean> {
  if (!isContractAddressValid()) {
    return false;
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      // 네트워크가 안정화될 때까지 잠시 대기
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * i));
      }
      
      const code = await provider.getCode(CONTRACT_ADDRESS);
      const exists = code !== "0x";
      
      if (!exists) {
        console.warn(`컨트랙트 코드가 없습니다. 주소: ${CONTRACT_ADDRESS}`);
        console.warn("가능한 원인:");
        console.warn("1. 컨트랙트가 해당 네트워크에 배포되지 않았습니다.");
        console.warn("2. 네트워크가 일치하지 않습니다.");
        try {
          const network = await provider.getNetwork();
          console.warn("현재 네트워크:", network);
        } catch (e) {
          // 네트워크 정보 조회 실패는 무시
        }
      }
      
      return exists;
    } catch (error: any) {
      // NETWORK_ERROR는 네트워크 변경 중 발생할 수 있으므로 재시도
      if (error.code === "NETWORK_ERROR" && i < retries - 1) {
        console.log(`네트워크 변경 중... 재시도 ${i + 1}/${retries}`);
        continue;
      }
      console.error("컨트랙트 존재 여부 확인 실패:", error);
      return false;
    }
  }
  
  return false;
}

export function getContract(provider: ethers.Provider | ethers.Signer) {
  if (!isContractAddressValid()) {
    throw new Error("컨트랙트 주소가 설정되지 않았습니다. src/config.ts에서 CONTRACT_ADDRESS를 확인해주세요.");
  }
  return new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, provider);
}

export async function getCurrentRound(contract: ethers.Contract) {
  const round = await contract.getCurrentRound();
  return {
    roundId: round[0],
    startTime: round[1],
    phase: Number(round[2]),
    winner: Number(round[3]),
    settled: round[4],
  };
}

export async function getPositions(contract: ethers.Contract) {
  const positions = await contract.getPositions();
  return positions.map((p: bigint) => Number(p));
}

export async function getTotalBets(contract: ethers.Contract) {
  const bets = await contract.getTotalBets();
  return bets;
}

export async function getUserBets(
  contract: ethers.Contract,
  roundId: bigint,
  userAddress: string
) {
  const bets = await contract.getUserBets(roundId, userAddress);
  return bets.map((bet: any) => ({
    bettor: bet.bettor,
    horseId: Number(bet.horseId),
    amount: bet.amount,
    claimed: bet.claimed,
  }));
}

export async function getUserWinnings(
  contract: ethers.Contract,
  roundId: bigint,
  userAddress: string
) {
  return await contract.getUserWinnings(roundId, userAddress);
}

export async function placeBet(
  contract: ethers.Contract,
  horseId: number,
  amount: string
) {
  const tx = await contract.placeBet(horseId, {
    value: ethers.parseEther(amount),
  });
  return await tx.wait();
}

export async function updatePositions(contract: ethers.Contract) {
  const tx = await contract.updatePositions();
  return await tx.wait();
}

export async function settleRound(contract: ethers.Contract) {
  const tx = await contract.settleRound();
  return await tx.wait();
}

export async function startNewRound(contract: ethers.Contract) {
  const tx = await contract.startNewRound();
  return await tx.wait();
}

export async function claimWinnings(
  contract: ethers.Contract,
  roundId: bigint
) {
  const tx = await contract.claimWinnings(roundId);
  return await tx.wait();
}

